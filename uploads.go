package main

// Uploaded symbols (SVG) and fonts (TTF, OTF, WOFF), shared by every account on the server.
// Files live in <data>/shared/uploads/<id>.<ext>; the list is <data>/shared/uploads/uploads.json.

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

const (
	maxSVGUpload  = 2 << 20
	maxFontUpload = 8 << 20
)

type Upload struct {
	ID    string    `json:"id"`
	Kind  string    `json:"kind"` // svg or font
	Name  string    `json:"name"`
	File  string    `json:"file"`
	Size  int       `json:"size"`
	By    string    `json:"by"`
	Added time.Time `json:"added"`
}

var uploadID = regexp.MustCompile(`^[a-f0-9]{24}$`)

func (s *Store) uploadsDir() string { return filepath.Join(s.dir, "shared", "uploads") }

func (s *Store) Uploads() []Upload {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.readUploads()
}

func (s *Store) readUploads() []Upload {
	var list []Upload
	b, err := os.ReadFile(filepath.Join(s.uploadsDir(), "uploads.json"))
	if err == nil {
		json.Unmarshal(b, &list)
	}
	if list == nil {
		list = []Upload{}
	}
	return list
}

func (s *Store) writeUploads(list []Upload) error {
	sort.Slice(list, func(i, j int) bool { return strings.ToLower(list[i].Name) < strings.ToLower(list[j].Name) })
	b, _ := json.MarshalIndent(list, "", "  ")
	return writeAtomic(filepath.Join(s.uploadsDir(), "uploads.json"), b)
}

// fontExt tells a font file by its first bytes; WOFF2 is refused because the program cannot read it.
func fontExt(b []byte) (string, error) {
	if len(b) < 4 {
		return "", errors.New("The file is not a font.")
	}
	switch string(b[:4]) {
	case "wOFF":
		return ".woff", nil
	case "wOF2":
		return "", errors.New("WOFF2 fonts cannot be used. Upload the TTF, OTF or WOFF file of the font.")
	case "OTTO":
		return ".otf", nil
	case "true", "\x00\x01\x00\x00":
		return ".ttf", nil
	}
	return "", errors.New("The file is not a font. Upload a TTF, OTF or WOFF file.")
}

func validSVG(b []byte) error {
	head := bytes.ToLower(b[:min(len(b), 4096)])
	if !bytes.Contains(head, []byte("<svg")) {
		return errors.New("The file is not an SVG image.")
	}
	return nil
}

func (s *Store) AddUpload(kind, name, by string, b []byte) (Upload, error) {
	name = strings.TrimSpace(name)
	name = strings.TrimSuffix(strings.TrimSuffix(strings.TrimSuffix(strings.TrimSuffix(strings.TrimSuffix(name, ".svg"), ".ttf"), ".otf"), ".woff"), ".SVG")
	if name == "" {
		name = "Upload"
	}
	if len([]rune(name)) > 60 {
		name = string([]rune(name)[:60])
	}
	var ext string
	switch kind {
	case "svg":
		if len(b) > maxSVGUpload {
			return Upload{}, errors.New("The SVG is larger than 2 MB.")
		}
		if err := validSVG(b); err != nil {
			return Upload{}, err
		}
		ext = ".svg"
	case "font":
		if len(b) > maxFontUpload {
			return Upload{}, errors.New("The font is larger than 8 MB.")
		}
		e, err := fontExt(b)
		if err != nil {
			return Upload{}, err
		}
		ext = e
	default:
		return Upload{}, errors.New("Unknown upload kind.")
	}
	u := Upload{ID: newID(), Kind: kind, Name: name, Size: len(b), By: by, Added: time.Now().UTC()}
	u.File = u.ID + ext
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := writeAtomic(filepath.Join(s.uploadsDir(), u.File), b); err != nil {
		return Upload{}, err
	}
	list := append(s.readUploads(), u)
	return u, s.writeUploads(list)
}

func (s *Store) UploadFile(id string) (Upload, []byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, u := range s.readUploads() {
		if u.ID == id {
			b, err := os.ReadFile(filepath.Join(s.uploadsDir(), u.File))
			return u, b, err
		}
	}
	return Upload{}, nil, errNotFound
}

func (s *Store) DeleteUpload(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	list := s.readUploads()
	for i, u := range list {
		if u.ID == id {
			os.Remove(filepath.Join(s.uploadsDir(), u.File))
			return s.writeUploads(append(list[:i], list[i+1:]...))
		}
	}
	return errNotFound
}

// ---------- routes ----------

func (s *server) uploadRoutes(m *http.ServeMux) {
	m.HandleFunc("GET /api/uploads", s.auth(func(w http.ResponseWriter, r *http.Request, u *User) { sendJSON(w, s.st.Uploads()) }))
	m.HandleFunc("POST /api/uploads", s.auth(func(w http.ResponseWriter, r *http.Request, u *User) {
		b, ok := readBody(w, r)
		if !ok {
			return
		}
		up, err := s.st.AddUpload(r.URL.Query().Get("kind"), r.URL.Query().Get("name"), u.Name, b)
		if err != nil {
			sendErr(w, http.StatusBadRequest, err.Error())
			return
		}
		sendJSON(w, up)
	}))
	m.HandleFunc("GET /api/uploads/{id}", s.auth(func(w http.ResponseWriter, r *http.Request, u *User) {
		id := strings.TrimSuffix(strings.TrimSuffix(strings.TrimSuffix(strings.TrimSuffix(r.PathValue("id"), ".svg"), ".ttf"), ".otf"), ".woff")
		if !uploadID.MatchString(id) {
			sendErr(w, http.StatusNotFound, "not found")
			return
		}
		up, b, err := s.st.UploadFile(id)
		if err != nil {
			sendErr(w, http.StatusNotFound, "not found")
			return
		}
		ct := map[string]string{".svg": "image/svg+xml", ".ttf": "font/ttf", ".otf": "font/otf", ".woff": "font/woff"}[filepath.Ext(up.File)]
		w.Header().Set("Content-Type", ct)
		w.Header().Set("Cache-Control", "private, max-age=300")
		w.Header().Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'")
		w.Write(b)
	}))
	m.HandleFunc("DELETE /api/uploads/{id}", s.auth(func(w http.ResponseWriter, r *http.Request, u *User) {
		if !uploadID.MatchString(r.PathValue("id")) || s.st.DeleteUpload(r.PathValue("id")) != nil {
			sendErr(w, http.StatusNotFound, "not found")
			return
		}
		sendJSON(w, map[string]bool{"ok": true})
	}))
}
