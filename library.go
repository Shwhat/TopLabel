package main

// The symbol library, kept under <data>/library/current:
//
//	vectors/set/<CODE>/<RARITY>.svg   set symbols from mtg-vectors (svg/optimized/set)
//	vectors/watermark/<name>.svg      watermarks from mtg-vectors (svg/optimized/watermark)
//	vectors/data/*.yml                mtg-vectors code aliases and routes (data/set)
//	sets.json                         the Scryfall set list, trimmed to the fields TopLabel uses
//	icons/<code>.svg                  Scryfall set icons for sets mtg-vectors does not have
//	meta.json                         when the library was downloaded and what it holds
//
// A refresh downloads everything into a new folder and swaps it in only when every step succeeded,
// so a failed refresh leaves the current library untouched.

import (
	"archive/tar"
	"compress/gzip"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

type ScryfallSet struct {
	Code     string `json:"code"`
	Name     string `json:"name"`
	Released string `json:"released_at"`
	Type     string `json:"set_type"`
	Parent   string `json:"parent_set_code"`
	Count    int    `json:"card_count"`
	Digital  bool   `json:"digital"`
	IconURI  string `json:"icon_svg_uri"`
}

type SetInfo struct {
	Code     string   `json:"code"`
	Name     string   `json:"name"`
	Date     string   `json:"date"`
	Type     string   `json:"type"`
	Parent   string   `json:"parent,omitempty"`
	Count    int      `json:"count"`
	Digital  bool     `json:"digital,omitempty"`
	Icon     string   `json:"icon"`             // Scryfall icon code, upper case
	Src      string   `json:"src"`              // vectors, scryfall or none
	Folder   string   `json:"folder,omitempty"` // mtg-vectors folder when Src is vectors
	Rarities []string `json:"rarities,omitempty"`
}

type LibMeta struct {
	Updated  time.Time `json:"updated"`
	Repo     string    `json:"repo"`
	Sets     int       `json:"sets"`
	Symbols  int       `json:"symbols"`
	Icons    int       `json:"icons"`
	Folders  int       `json:"folders"`
	Watermks int       `json:"watermarks"`
}

type LibIndex struct {
	Ready      bool      `json:"ready"`
	Meta       LibMeta   `json:"meta"`
	Sets       []SetInfo `json:"sets"`
	Watermarks []string  `json:"watermarks"`
	Fonts      any       `json:"fonts"`
}

type RefreshStatus struct {
	Running  bool      `json:"running"`
	Step     string    `json:"step"`
	Done     int       `json:"done"`
	Total    int       `json:"total"`
	Error    string    `json:"error"`
	Finished time.Time `json:"finished"`
}

type Library struct {
	cfg    config
	dir    string
	client *http.Client
	mu     sync.RWMutex
	idx    LibIndex
	fonts  any
	smu    sync.Mutex
	status RefreshStatus
}

func openLibrary(cfg config) (*Library, error) {
	l := &Library{cfg: cfg, dir: filepath.Join(cfg.Data, "library"), client: &http.Client{Timeout: 5 * time.Minute}}
	if err := os.MkdirAll(l.dir, 0o750); err != nil {
		return nil, err
	}
	if b, err := assets.ReadFile("assets/fonts/fonts.json"); err == nil {
		json.Unmarshal(b, &l.fonts)
	}
	// leftovers from an interrupted refresh
	if ents, err := os.ReadDir(l.dir); err == nil {
		for _, e := range ents {
			if strings.HasPrefix(e.Name(), "new-") || strings.HasPrefix(e.Name(), "old-") {
				os.RemoveAll(filepath.Join(l.dir, e.Name()))
			}
		}
	}
	if err := l.load(); err != nil {
		log.Printf("TopLabel: the symbol library could not be read: %v", err)
	}
	return l, nil
}

func (l *Library) current() string { return filepath.Join(l.dir, "current") }

func (l *Library) Empty() bool {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return !l.idx.Ready
}

func (l *Library) Index() LibIndex {
	l.mu.RLock()
	defer l.mu.RUnlock()
	ix := l.idx
	ix.Fonts = l.fonts
	if ix.Sets == nil {
		ix.Sets = []SetInfo{}
	}
	if ix.Watermarks == nil {
		ix.Watermarks = []string{}
	}
	return ix
}

func (l *Library) ReadFile(rel string) ([]byte, error) {
	p := filepath.Join(l.current(), filepath.FromSlash(rel))
	if !strings.HasPrefix(p, l.current()+string(os.PathSeparator)) {
		return nil, errNotFound
	}
	return os.ReadFile(p)
}

func (l *Library) Status() RefreshStatus {
	l.smu.Lock()
	defer l.smu.Unlock()
	return l.status
}

func (l *Library) setStatus(f func(s *RefreshStatus)) {
	l.smu.Lock()
	f(&l.status)
	l.smu.Unlock()
}

// ---------- reading the library ----------

// readYAMLMap reads the simple "KEY: VALUE" files mtg-vectors keeps in data/set.
func readYAMLMap(p string) map[string]string {
	out := map[string]string{}
	b, err := os.ReadFile(p)
	if err != nil {
		return out
	}
	for _, line := range strings.Split(string(b), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "-") {
			continue
		}
		k, v, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}
		k, v = strings.Trim(strings.TrimSpace(k), `'"`), strings.Trim(strings.TrimSpace(v), `'"`)
		if k != "" && v != "" {
			out[strings.ToUpper(k)] = strings.ToUpper(v)
		}
	}
	return out
}

var rarityOrder = map[string]int{"C": 0, "U": 1, "R": 2, "M": 3, "S": 4, "T": 5, "WM": 6}

func sortRarities(r []string) {
	sort.Slice(r, func(i, j int) bool {
		a, ok1 := rarityOrder[r[i]]
		b, ok2 := rarityOrder[r[j]]
		if !ok1 {
			a = 100
		}
		if !ok2 {
			b = 100
		}
		if a != b {
			return a < b
		}
		return r[i] < r[j]
	})
}

// iconCode is the file name of the Scryfall icon, for example "neo" for https://svgs.scryfall.io/sets/neo.svg?1700000000.
func iconCode(uri string) string {
	u, err := url.Parse(uri)
	if err != nil {
		return ""
	}
	return strings.ToUpper(strings.TrimSuffix(path.Base(u.Path), ".svg"))
}

func (l *Library) load() error {
	cur := l.current()
	var raw []ScryfallSet
	b, err := os.ReadFile(filepath.Join(cur, "sets.json"))
	if errors.Is(err, os.ErrNotExist) {
		l.mu.Lock()
		l.idx = LibIndex{}
		l.mu.Unlock()
		return nil
	}
	if err != nil {
		return err
	}
	if err := json.Unmarshal(b, &raw); err != nil {
		return err
	}
	var meta LibMeta
	readJSON(filepath.Join(cur, "meta.json"), &meta)
	idx := buildIndex(cur, raw)
	idx.Meta = meta
	idx.Ready = true
	l.mu.Lock()
	l.idx = idx
	l.mu.Unlock()
	return nil
}

func buildIndex(cur string, raw []ScryfallSet) LibIndex {
	folders := map[string][]string{}
	if ents, err := os.ReadDir(filepath.Join(cur, "vectors", "set")); err == nil {
		for _, e := range ents {
			if !e.IsDir() {
				continue
			}
			files, _ := os.ReadDir(filepath.Join(cur, "vectors", "set", e.Name()))
			var rs []string
			for _, f := range files {
				if strings.HasSuffix(f.Name(), ".svg") {
					rs = append(rs, strings.TrimSuffix(f.Name(), ".svg"))
				}
			}
			sortRarities(rs)
			folders[strings.ToUpper(e.Name())] = rs
		}
	}
	alias := readYAMLMap(filepath.Join(cur, "vectors", "data", "alias.yml"))
	routes := readYAMLMap(filepath.Join(cur, "vectors", "data", "routes.yml"))
	var idx LibIndex
	for _, s := range raw {
		code := strings.ToUpper(s.Code)
		ic := iconCode(s.IconURI)
		si := SetInfo{Code: code, Name: s.Name, Date: s.Released, Type: s.Type, Parent: strings.ToUpper(s.Parent), Count: s.Count, Digital: s.Digital, Icon: ic, Src: "none"}
		for _, c := range []string{routes[code], alias[ic], ic, alias[code], code} {
			if c == "" {
				continue
			}
			if rs, ok := folders[c]; ok && len(rs) > 0 {
				si.Src, si.Folder, si.Rarities = "vectors", c, rs
				break
			}
		}
		if si.Src == "none" && ic != "" {
			if _, err := os.Stat(filepath.Join(cur, "icons", strings.ToLower(ic)+".svg")); err == nil {
				si.Src = "scryfall"
			}
		}
		idx.Sets = append(idx.Sets, si)
	}
	sort.SliceStable(idx.Sets, func(i, j int) bool {
		if idx.Sets[i].Date != idx.Sets[j].Date {
			return idx.Sets[i].Date > idx.Sets[j].Date
		}
		return idx.Sets[i].Code < idx.Sets[j].Code
	})
	if ents, err := os.ReadDir(filepath.Join(cur, "vectors", "watermark")); err == nil {
		for _, e := range ents {
			if !e.IsDir() && strings.HasSuffix(e.Name(), ".svg") {
				idx.Watermarks = append(idx.Watermarks, strings.TrimSuffix(e.Name(), ".svg"))
			}
		}
	}
	return idx
}

// ---------- refresh ----------

func (l *Library) StartRefresh() bool {
	l.smu.Lock()
	if l.status.Running {
		l.smu.Unlock()
		return false
	}
	l.status = RefreshStatus{Running: true, Step: "Starting"}
	l.smu.Unlock()
	go func() {
		err := l.refresh()
		l.setStatus(func(s *RefreshStatus) {
			s.Running = false
			s.Finished = time.Now().UTC()
			if err != nil {
				s.Error = err.Error()
				s.Step = "Failed"
			} else {
				s.Step = "Done"
			}
		})
		if err != nil {
			log.Printf("TopLabel: library refresh failed: %v", err)
		} else {
			log.Print("TopLabel: library refresh finished")
		}
	}()
	return true
}

func (l *Library) get(u string) (*http.Response, error) {
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "TopLabel/"+version())
	req.Header.Set("Accept", "*/*")
	res, err := l.client.Do(req)
	if err != nil {
		return nil, err
	}
	if res.StatusCode != http.StatusOK {
		res.Body.Close()
		return nil, fmt.Errorf("%s answered %s", hostOf(u), res.Status)
	}
	return res, nil
}

func hostOf(u string) string {
	p, err := url.Parse(u)
	if err != nil {
		return u
	}
	return p.Host
}

var (
	reSetFile = regexp.MustCompile(`^svg/optimized/set/([A-Za-z0-9][A-Za-z0-9_-]{0,15})/([A-Za-z0-9][A-Za-z0-9_-]{0,15})\.svg$`)
	reWmFile  = regexp.MustCompile(`^svg/optimized/watermark/([a-z0-9][a-z0-9&_.-]{0,60})\.svg$`)
	reData    = regexp.MustCompile(`^data/set/([a-z]+)\.yml$`)
)

const maxFile = 4 << 20
const maxTotal = 400 << 20

func (l *Library) refresh() error {
	dst := filepath.Join(l.dir, fmt.Sprintf("new-%d", time.Now().UnixNano()))
	if err := os.MkdirAll(dst, 0o750); err != nil {
		return err
	}
	ok := false
	defer func() {
		if !ok {
			os.RemoveAll(dst)
		}
	}()

	// 1. mtg-vectors from GitHub
	l.setStatus(func(s *RefreshStatus) { s.Step = "Downloading symbols from GitHub" })
	res, err := l.get(l.cfg.GitHubAPI + "/repos/" + l.cfg.VectorsRepo + "/tarball")
	if err != nil {
		return fmt.Errorf("could not download the symbols from GitHub: %w", err)
	}
	symbols, folders, wms, err := extractVectors(res.Body, dst, func(n int) { l.setStatus(func(s *RefreshStatus) { s.Done = n }) })
	res.Body.Close()
	if err != nil {
		return fmt.Errorf("could not read the symbols download: %w", err)
	}
	if symbols == 0 {
		return errors.New("the symbols download held no set symbols")
	}

	// 2. the Scryfall set list
	l.setStatus(func(s *RefreshStatus) { s.Step = "Downloading the set list from Scryfall"; s.Done = 0 })
	res, err = l.get(l.cfg.ScryfallAPI + "/sets")
	if err != nil {
		return fmt.Errorf("could not download the set list from Scryfall: %w", err)
	}
	var list struct {
		Data []ScryfallSet `json:"data"`
	}
	err = json.NewDecoder(io.LimitReader(res.Body, 64<<20)).Decode(&list)
	res.Body.Close()
	if err != nil {
		return fmt.Errorf("could not read the Scryfall set list: %w", err)
	}
	if len(list.Data) == 0 {
		return errors.New("the Scryfall set list was empty")
	}
	if err := writeJSON(filepath.Join(dst, "sets.json"), list.Data); err != nil {
		return err
	}

	// 3. Scryfall icons for sets mtg-vectors does not have
	idx := buildIndex(dst, list.Data)
	need := map[string]string{}
	for i, s := range idx.Sets {
		if s.Src == "none" && s.Icon != "" && safeName.MatchString(s.Icon) {
			for _, r := range list.Data {
				if strings.EqualFold(r.Code, s.Code) {
					need[strings.ToLower(s.Icon)] = r.IconURI
					break
				}
			}
		}
		_ = i
	}
	icons := 0
	if len(need) > 0 {
		keys := make([]string, 0, len(need))
		for k := range need {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		l.setStatus(func(s *RefreshStatus) {
			s.Step = "Downloading Scryfall icons for sets without a symbol"
			s.Done = 0
			s.Total = len(keys)
		})
		os.MkdirAll(filepath.Join(dst, "icons"), 0o750)
		var wg sync.WaitGroup
		var mu sync.Mutex
		sem := make(chan struct{}, 4)
		for _, k := range keys {
			wg.Add(1)
			sem <- struct{}{}
			go func(k, u string) {
				defer wg.Done()
				defer func() { <-sem }()
				if res, err := l.get(u); err == nil {
					b, err := io.ReadAll(io.LimitReader(res.Body, maxFile))
					res.Body.Close()
					if err == nil && strings.Contains(string(b), "<svg") {
						if os.WriteFile(filepath.Join(dst, "icons", k+".svg"), b, 0o640) == nil {
							mu.Lock()
							icons++
							mu.Unlock()
						}
					}
				}
				l.setStatus(func(s *RefreshStatus) { s.Done++ })
				time.Sleep(60 * time.Millisecond)
			}(k, need[k])
		}
		wg.Wait()
	}

	meta := LibMeta{Updated: time.Now().UTC(), Repo: l.cfg.VectorsRepo, Sets: len(list.Data), Symbols: symbols, Icons: icons, Folders: folders, Watermks: wms}
	if err := writeJSON(filepath.Join(dst, "meta.json"), meta); err != nil {
		return err
	}

	// 4. swap in the new library
	l.setStatus(func(s *RefreshStatus) { s.Step = "Installing the new library"; s.Total = 0; s.Done = 0 })
	l.mu.Lock()
	cur := l.current()
	old := filepath.Join(l.dir, fmt.Sprintf("old-%d", time.Now().UnixNano()))
	if _, err := os.Stat(cur); err == nil {
		if err := os.Rename(cur, old); err != nil {
			l.mu.Unlock()
			return err
		}
	}
	if err := os.Rename(dst, cur); err != nil {
		os.Rename(old, cur)
		l.mu.Unlock()
		return err
	}
	l.mu.Unlock()
	ok = true
	os.RemoveAll(old)
	return l.load()
}

// extractVectors copies the set symbols, watermarks and set data files out of the mtg-vectors tarball.
func extractVectors(r io.Reader, dst string, progress func(int)) (symbols, folders, watermarks int, err error) {
	gz, err := gzip.NewReader(r)
	if err != nil {
		return 0, 0, 0, err
	}
	defer gz.Close()
	tr := tar.NewReader(gz)
	total := int64(0)
	seen := map[string]bool{}
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return 0, 0, 0, err
		}
		if h.Typeflag != tar.TypeReg {
			continue
		}
		// GitHub tarballs start every path with "<owner>-<repo>-<commit>/"
		name := h.Name
		if i := strings.Index(name, "/"); i >= 0 {
			name = name[i+1:]
		}
		var out string
		if m := reSetFile.FindStringSubmatch(name); m != nil {
			out = filepath.Join(dst, "vectors", "set", strings.ToUpper(m[1]), strings.ToUpper(m[2])+".svg")
			symbols++
			if !seen[m[1]] {
				seen[m[1]] = true
				folders++
			}
		} else if m := reWmFile.FindStringSubmatch(name); m != nil {
			out = filepath.Join(dst, "vectors", "watermark", m[1]+".svg")
			watermarks++
		} else if m := reData.FindStringSubmatch(name); m != nil {
			out = filepath.Join(dst, "vectors", "data", m[1]+".yml")
		} else {
			continue
		}
		if h.Size > maxFile {
			continue
		}
		total += h.Size
		if total > maxTotal {
			return 0, 0, 0, errors.New("the download is larger than expected")
		}
		if err := os.MkdirAll(filepath.Dir(out), 0o750); err != nil {
			return 0, 0, 0, err
		}
		f, err := os.OpenFile(out, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o640)
		if err != nil {
			return 0, 0, 0, err
		}
		_, err = io.Copy(f, io.LimitReader(tr, maxFile))
		f.Close()
		if err != nil {
			return 0, 0, 0, err
		}
		if symbols%100 == 0 {
			progress(symbols)
		}
	}
	progress(symbols)
	return symbols, folders, watermarks, nil
}
