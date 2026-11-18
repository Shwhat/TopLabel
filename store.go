package main

// Data folder layout (all paths under the data directory):
//
//	users.json                    accounts
//	sessions.json                 sign-in sessions (token hashes only)
//	users/<id>/prefs.json         per-user preferences
//	users/<id>/labels.json        per-user saved labels and the batch queue
//	shared/arrangements.json      saved arrangements, shared by all users
//	shared/presets.json           saved sizes, depth profiles and palettes, shared
//	library/current/              the symbol library (see library.go)

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type User struct {
	ID      string    `json:"id"`
	Name    string    `json:"name"`
	Salt    string    `json:"salt"`
	Hash    string    `json:"hash"`
	Iter    int       `json:"iter"`
	Created time.Time `json:"created"`
}

type Session struct {
	User    string    `json:"user"`
	Expires time.Time `json:"expires"`
}

type UserInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// files the interface may read and write through /api/data; true means shared by all users
var dataFiles = map[string]bool{"prefs.json": false, "labels.json": false, "arrangements.json": true, "presets.json": true}

var (
	errNotFound = errors.New("not found")
	errConflict = errors.New("conflict")
)

type Store struct {
	dir      string
	mu       sync.Mutex
	users    []*User
	sessions map[string]*Session
}

func newID() string {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

// writeAtomic writes through a temporary file and a rename so a crash never leaves half a file.
func writeAtomic(path string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		return err
	}
	tmp := path + ".tmp"
	f, err := os.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o640)
	if err != nil {
		return err
	}
	if _, err = f.Write(data); err == nil {
		err = f.Sync()
	}
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		os.Remove(tmp)
		return err
	}
	return os.Rename(tmp, path)
}

func readJSON(path string, v any) error {
	b, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	return json.Unmarshal(b, v)
}

func writeJSON(path string, v any) error {
	b, err := json.MarshalIndent(v, "", " ")
	if err != nil {
		return err
	}
	return writeAtomic(path, b)
}

func openStore(dir string) (*Store, error) {
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return nil, err
	}
	s := &Store{dir: dir, sessions: map[string]*Session{}}
	var u struct{ Users []*User }
	if err := readJSON(filepath.Join(dir, "users.json"), &u); err != nil {
		return nil, err
	}
	s.users = u.Users
	if err := readJSON(filepath.Join(dir, "sessions.json"), &s.sessions); err != nil {
		return nil, err
	}
	if s.sessions == nil {
		s.sessions = map[string]*Session{}
	}
	return s, nil
}

func (s *Store) saveUsers() error {
	return writeJSON(filepath.Join(s.dir, "users.json"), struct {
		Users []*User `json:"users"`
	}{s.users})
}

func (s *Store) saveSessions() error {
	return writeJSON(filepath.Join(s.dir, "sessions.json"), s.sessions)
}

// ---------- users ----------

func (s *Store) UserCount() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.users)
}

func (s *Store) userByName(name string) *User {
	for _, u := range s.users {
		if strings.EqualFold(u.Name, name) {
			return u
		}
	}
	return nil
}

func (s *Store) userByID(id string) *User {
	for _, u := range s.users {
		if u.ID == id {
			return u
		}
	}
	return nil
}

func (s *Store) AddUser(name, password string) (*User, error) {
	salt, hash, iter := hashPassword(password) // slow; done before taking the lock
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.userByName(name) != nil {
		return nil, errConflict
	}
	u := &User{ID: newID(), Name: name, Salt: salt, Hash: hash, Iter: iter, Created: time.Now().UTC()}
	s.users = append(s.users, u)
	if err := s.saveUsers(); err != nil {
		s.users = s.users[:len(s.users)-1]
		return nil, err
	}
	return u, nil
}

// CheckPassword returns the user when name and password match.
func (s *Store) CheckPassword(name, password string) *User {
	s.mu.Lock()
	u := s.userByName(name)
	var cp User
	if u != nil {
		cp = *u
	}
	s.mu.Unlock()
	if u == nil {
		verifyPassword(password, dummySalt, dummyHash, defaultIter) // same cost as a real check
		return nil
	}
	if !verifyPassword(password, cp.Salt, cp.Hash, cp.Iter) {
		return nil
	}
	return u
}

func (s *Store) SetPassword(id, password string) error {
	salt, hash, iter := hashPassword(password)
	s.mu.Lock()
	defer s.mu.Unlock()
	u := s.userByID(id)
	if u == nil {
		return errNotFound
	}
	u.Salt, u.Hash, u.Iter = salt, hash, iter
	for k, v := range s.sessions {
		if v.User == id {
			delete(s.sessions, k)
		}
	}
	if err := s.saveSessions(); err != nil {
		return err
	}
	return s.saveUsers()
}

// ---------- sessions ----------

const sessionLife = 30 * 24 * time.Hour

func (s *Store) NewSession(userID string) (string, error) {
	tok := newID() + newID()
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	for k, v := range s.sessions {
		if now.After(v.Expires) {
			delete(s.sessions, k)
		}
	}
	s.sessions[tokenKey(tok)] = &Session{User: userID, Expires: now.Add(sessionLife).UTC()}
	return tok, s.saveSessions()
}

// Session returns the signed-in user for a token and extends the session when it is more than a day old.
func (s *Store) Session(tok string) *User {
	if tok == "" {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	k := tokenKey(tok)
	se := s.sessions[k]
	if se == nil {
		return nil
	}
	now := time.Now()
	if now.After(se.Expires) {
		delete(s.sessions, k)
		s.saveSessions()
		return nil
	}
	if se.Expires.Sub(now) < sessionLife-24*time.Hour {
		se.Expires = now.Add(sessionLife).UTC()
		s.saveSessions()
	}
	return s.userByID(se.User)
}

func (s *Store) EndSession(tok string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, tokenKey(tok))
	s.saveSessions()
}

// ---------- data files ----------

func (s *Store) dataPath(uid, name string) (string, bool) {
	shared, ok := dataFiles[name]
	if !ok {
		return "", false
	}
	if shared {
		return filepath.Join(s.dir, "shared", name), true
	}
	return filepath.Join(s.dir, "users", uid, name), true
}

func (s *Store) ReadData(uid, name string) ([]byte, error) {
	p, ok := s.dataPath(uid, name)
	if !ok {
		return nil, errNotFound
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	b, err := os.ReadFile(p)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	return b, err
}

func (s *Store) WriteData(uid, name string, content []byte) error {
	p, ok := s.dataPath(uid, name)
	if !ok {
		return errNotFound
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return writeAtomic(p, content)
}
