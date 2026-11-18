package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

const svgSym = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>`

// fakeUpstream serves a small mtg-vectors tarball, a Scryfall set list and one Scryfall icon.
func fakeUpstream(t *testing.T, fail *atomic.Bool) *httptest.Server {
	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gz)
	add := func(name, body string) {
		tw.WriteHeader(&tar.Header{Name: "Investigamer-mtg-vectors-abc/" + name, Mode: 0o644, Size: int64(len(body)), Typeflag: tar.TypeReg})
		tw.Write([]byte(body))
	}
	add("svg/optimized/set/NEO/C.svg", svgSym)
	add("svg/optimized/set/NEO/R.svg", svgSym)
	add("svg/optimized/set/CONF/C.svg", svgSym)
	add("svg/optimized/set/../../evil.svg", svgSym)
	add("svg/optimized/watermark/plains.svg", svgSym)
	add("data/set/alias.yml", "# aliases\nCON: CONF\n")
	add("data/set/routes.yml", "PNEO: NEO\n")
	add("README.md", "ignored")
	tw.Close()
	gz.Close()
	tarball := buf.Bytes()
	var srv *httptest.Server
	srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if fail.Load() {
			http.Error(w, "down", http.StatusServiceUnavailable)
			return
		}
		switch {
		case strings.HasSuffix(r.URL.Path, "/tarball"):
			w.Write(tarball)
		case r.URL.Path == "/sets":
			ic := func(c string) string { return srv.URL + "/icons/" + c + ".svg?123" }
			json.NewEncoder(w).Encode(map[string]any{"data": []map[string]any{
				{"code": "neo", "name": "Kamigawa: Neon Dynasty", "released_at": "2022-02-18", "set_type": "expansion", "card_count": 512, "icon_svg_uri": ic("neo")},
				{"code": "pneo", "name": "Kamigawa: Neon Dynasty Promos", "released_at": "2022-02-18", "set_type": "promo", "icon_svg_uri": ic("default")},
				{"code": "con", "name": "Conflux", "released_at": "2009-02-06", "set_type": "expansion", "icon_svg_uri": ic("con")},
				{"code": "zzt", "name": "Icon Only", "released_at": "2026-10-01", "set_type": "expansion", "icon_svg_uri": ic("zzt")},
				{"code": "zzn", "name": "No Symbol", "released_at": "2026-10-02", "set_type": "expansion", "icon_svg_uri": ic("zzn")},
			}})
		case r.URL.Path == "/icons/zzt.svg":
			w.Write([]byte(svgSym))
		default:
			http.NotFound(w, r)
		}
	}))
	return srv
}

func testServer(t *testing.T, signup bool) (*server, *httptest.Server, *httptest.Server, *atomic.Bool) {
	defaultIter = 1000 // fast password hashing in tests
	fail := &atomic.Bool{}
	up := fakeUpstream(t, fail)
	t.Cleanup(up.Close)
	cfg := config{Data: t.TempDir(), Signup: signup, Secure: "auto", VectorsRepo: "x/y", GitHubAPI: up.URL, ScryfallAPI: up.URL}
	s, err := newServer(cfg)
	if err != nil {
		t.Fatal(err)
	}
	ts := httptest.NewServer(s.routes())
	t.Cleanup(ts.Close)
	return s, ts, up, fail
}

func client(t *testing.T) *http.Client {
	jar, _ := cookiejar.New(nil)
	return &http.Client{Jar: jar}
}

func call(t *testing.T, c *http.Client, method, url, body string) (int, string) {
	req, _ := http.NewRequest(method, url, strings.NewReader(body))
	req.Header.Set("X-TopLabel", "1")
	req.Header.Set("Content-Type", "application/json")
	res, err := c.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	return res.StatusCode, string(b)
}

func waitRefresh(t *testing.T, s *server) RefreshStatus {
	for i := 0; i < 200; i++ {
		st := s.lib.Status()
		if !st.Running {
			return st
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatal("refresh did not finish")
	return RefreshStatus{}
}

func TestFirstAccountAndSignupOff(t *testing.T) {
	_, ts, _, _ := testServer(t, false)
	a := client(t)
	if code, body := call(t, a, "GET", ts.URL+"/api/config", ""); code != 200 || !strings.Contains(body, `"firstUser":true`) || !strings.Contains(body, `"signup":true`) {
		t.Fatalf("config before the first account: %d %s", code, body)
	}
	if code, body := call(t, a, "POST", ts.URL+"/api/signup", `{"name":"devon","password":"password123"}`); code != 200 {
		t.Fatalf("first account: %d %s", code, body)
	}
	if code, _ := call(t, client(t), "POST", ts.URL+"/api/signup", `{"name":"other","password":"password123"}`); code != 403 {
		t.Fatalf("second account with sign-up off: got %d", code)
	}
	if code, _ := call(t, client(t), "POST", ts.URL+"/api/login", `{"name":"devon","password":"wrong-password"}`); code != 401 {
		t.Fatalf("wrong password: got %d", code)
	}
	b := client(t)
	if code, _ := call(t, b, "POST", ts.URL+"/api/login", `{"name":"DEVON","password":"password123"}`); code != 200 {
		t.Fatalf("sign in: got %d", code)
	}
	if code, body := call(t, b, "GET", ts.URL+"/api/me", ""); code != 200 || !strings.Contains(body, "devon") {
		t.Fatalf("me: %d %s", code, body)
	}
}

func TestAuthRequiredAndCSRF(t *testing.T) {
	_, ts, _, _ := testServer(t, true)
	c := client(t)
	for _, u := range []string{"/api/library", "/api/data/prefs.json", "/api/library/set/NEO/C.svg"} {
		if code, _ := call(t, c, "GET", ts.URL+u, ""); code != 401 {
			t.Fatalf("%s without sign-in: got %d", u, code)
		}
	}
	res, _ := c.Get(ts.URL + "/")
	if res.Request.URL.Path != "/login" {
		t.Fatalf("app page without sign-in should go to /login, went to %s", res.Request.URL.Path)
	}
	req, _ := http.NewRequest("POST", ts.URL+"/api/signup", strings.NewReader(`{"name":"devon","password":"password123"}`))
	res, _ = c.Do(req)
	if res.StatusCode != 403 {
		t.Fatalf("POST without the X-TopLabel header: got %d", res.StatusCode)
	}
}

func TestDataFiles(t *testing.T) {
	_, ts, _, _ := testServer(t, true)
	a, b := client(t), client(t)
	call(t, a, "POST", ts.URL+"/api/signup", `{"name":"alice","password":"password123"}`)
	call(t, b, "POST", ts.URL+"/api/signup", `{"name":"bob","password":"password123"}`)
	if code, _ := call(t, a, "PUT", ts.URL+"/api/data/labels.json", `[{"id":"l1"}]`); code != 200 {
		t.Fatalf("write labels: %d", code)
	}
	if _, body := call(t, b, "GET", ts.URL+"/api/data/labels.json", ""); body != "null" {
		t.Fatalf("labels are per user, bob saw %s", body)
	}
	call(t, a, "PUT", ts.URL+"/api/data/arrangements.json", `[{"id":"a1"}]`)
	if _, body := call(t, b, "GET", ts.URL+"/api/data/arrangements.json", ""); !strings.Contains(body, "a1") {
		t.Fatalf("arrangements are shared, bob saw %s", body)
	}
	if code, _ := call(t, a, "PUT", ts.URL+"/api/data/users.json", `[]`); code != 404 {
		t.Fatalf("files outside the allow list: got %d", code)
	}
	if code, _ := call(t, a, "PUT", ts.URL+"/api/data/prefs.json", `not json`); code != 400 {
		t.Fatalf("invalid JSON: got %d", code)
	}
}

func TestRefreshBuildsTheIndex(t *testing.T) {
	s, ts, _, _ := testServer(t, true)
	c := client(t)
	call(t, c, "POST", ts.URL+"/api/signup", `{"name":"devon","password":"password123"}`)
	if !s.lib.Empty() {
		t.Fatal("library should start empty")
	}
	if code, body := call(t, c, "POST", ts.URL+"/api/library/refresh", ""); code != 200 {
		t.Fatalf("refresh: %d %s", code, body)
	}
	if st := waitRefresh(t, s); st.Error != "" {
		t.Fatalf("refresh failed: %s", st.Error)
	}
	ix := s.lib.Index()
	got := map[string]string{}
	for _, st := range ix.Sets {
		got[st.Code] = st.Src + ":" + st.Folder
	}
	want := map[string]string{"NEO": "vectors:NEO", "PNEO": "vectors:NEO", "CON": "vectors:CONF", "ZZT": "scryfall:", "ZZN": "none:"}
	for k, v := range want {
		if got[k] != v {
			t.Errorf("%s: want %s, got %s", k, v, got[k])
		}
	}
	if len(ix.Watermarks) != 1 || ix.Watermarks[0] != "plains" {
		t.Errorf("watermarks: %v", ix.Watermarks)
	}
	if ix.Meta.Symbols != 3 || ix.Meta.Icons != 1 {
		t.Errorf("meta: %+v", ix.Meta)
	}
	if _, err := os.Stat(filepath.Join(s.cfg.Data, "evil.svg")); err == nil {
		t.Error("a path outside the library was written")
	}
	if code, body := call(t, c, "GET", ts.URL+"/api/library/set/NEO/R.svg", ""); code != 200 || !strings.Contains(body, "<svg") {
		t.Errorf("symbol file: %d %s", code, body)
	}
	for _, u := range []string{"/api/library/set/NEO/..%2F..%2Fusers.json", "/api/library/set/NEO/C.txt", "/api/library/icon/zzn.svg"} {
		if code, _ := call(t, c, "GET", ts.URL+u, ""); code != 404 {
			t.Errorf("%s: want 404, got %d", u, code)
		}
	}
	if code, body := call(t, c, "GET", ts.URL+"/api/library", ""); code != 200 || !strings.Contains(body, `"fonts":[`) || !strings.Contains(body, `"ready":true`) {
		t.Errorf("library index: %d %.200s", code, body)
	}
}

func TestFailedRefreshKeepsTheLibrary(t *testing.T) {
	s, _, _, fail := testServer(t, true)
	s.lib.StartRefresh()
	if st := waitRefresh(t, s); st.Error != "" {
		t.Fatalf("first refresh: %s", st.Error)
	}
	before := len(s.lib.Index().Sets)
	fail.Store(true)
	if !s.lib.StartRefresh() {
		t.Fatal("refresh did not start")
	}
	st := waitRefresh(t, s)
	if st.Error == "" || !strings.Contains(st.Error, "GitHub") {
		t.Fatalf("want a GitHub error, got %q", st.Error)
	}
	if n := len(s.lib.Index().Sets); n != before || n == 0 {
		t.Fatalf("library changed after a failed refresh: %d sets, was %d", n, before)
	}
	ents, _ := os.ReadDir(filepath.Join(s.cfg.Data, "library"))
	for _, e := range ents {
		if e.Name() != "current" {
			t.Errorf("leftover folder %s", e.Name())
		}
	}
}

func TestFontsAndPage(t *testing.T) {
	_, ts, _, _ := testServer(t, true)
	res, err := http.Get(ts.URL + "/fonts/comic-neue/700.woff")
	if err != nil || res.StatusCode != 200 || res.Header.Get("Content-Type") != "font/woff" {
		t.Fatalf("font: %v %v", err, res)
	}
	res, _ = http.Get(ts.URL + "/fonts/..%2Fassets/fonts.json")
	if res.StatusCode != 404 {
		t.Fatalf("font path escape: got %d", res.StatusCode)
	}
	page := assemble()
	if !strings.Contains(page, "APP_VERSION = '"+version()+"'") || strings.Contains(page, "/*JS*/") || strings.Contains(page, "/*CSS*/") {
		t.Fatal("the assembled page is incomplete")
	}
	if fmt.Sprint(version()) == "?" {
		t.Fatal("version not found")
	}
}
