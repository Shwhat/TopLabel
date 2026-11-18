// TopLabel server: serves the interface in ui/ to the browser, stores accounts, labels, preferences and shared
// presets in a data folder, and keeps the symbol library (mtg-vectors and Scryfall) up to date.
// All label building, 3D geometry and file export happens in the browser.
package main

import (
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path"
	"regexp"
	"strings"
	"time"
	_ "time/tzdata" // the image has no time zone files; TZ in the compose file still works
)

//go:embed ui web assets
var assets embed.FS

const maxBody = 16 << 20

type config struct {
	Addr        string
	Data        string
	Signup      bool
	Secure      string // auto, always or never
	VectorsRepo string
	GitHubAPI   string
	ScryfallAPI string
	AutoRefresh bool
}

func env(k, def string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return def
}

func truthy(s string) bool {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "1", "true", "on", "yes":
		return true
	}
	return false
}

func loadConfig() config {
	return config{
		Addr:        env("TOPLABEL_ADDR", ":8080"),
		Data:        env("TOPLABEL_DATA", "/data"),
		Signup:      truthy(env("TOPLABEL_SIGNUP", "false")),
		Secure:      strings.ToLower(env("TOPLABEL_SECURE_COOKIE", "auto")),
		VectorsRepo: env("TOPLABEL_VECTORS_REPO", "Investigamer/mtg-vectors"),
		GitHubAPI:   strings.TrimRight(env("TOPLABEL_GITHUB_API", "https://api.github.com"), "/"),
		ScryfallAPI: strings.TrimRight(env("TOPLABEL_SCRYFALL_API", "https://api.scryfall.com"), "/"),
		AutoRefresh: truthy(env("TOPLABEL_AUTO_REFRESH", "true")),
	}
}

// assemble builds the single page the browser loads: index.html with the stylesheet and
// every script listed in ui/manifest.txt inlined in order.
func assemble() string {
	read := func(n string) string { b, _ := assets.ReadFile("ui/" + n); return string(b) }
	var js strings.Builder
	for _, line := range strings.Split(read("manifest.txt"), "\n") {
		n := strings.TrimSpace(line)
		if n == "" || strings.HasPrefix(n, "#") {
			continue
		}
		js.WriteString(read(n))
		js.WriteString("\n")
	}
	code := strings.ReplaceAll(strings.ReplaceAll(js.String(), "</script", "<\\/script"), "<script", "<\\x73cript")
	page := strings.Replace(read("index.html"), "/*CSS*/", read("style.css"), 1)
	return strings.Replace(page, "/*JS*/", code, 1)
}

type server struct {
	cfg       config
	st        *Store
	lib       *Library
	appHead   string
	appTail   string
	loginPage []byte
	loginLim  *limiter
	ipLim     *limiter
}

func newServer(cfg config) (*server, error) {
	st, err := openStore(cfg.Data)
	if err != nil {
		return nil, err
	}
	lib, err := openLibrary(cfg)
	if err != nil {
		return nil, err
	}
	app := assemble()
	i := strings.Index(app, "<head>")
	if i < 0 {
		return nil, errors.New("ui/index.html has no <head>")
	}
	lp, err := assets.ReadFile("web/login.html")
	if err != nil {
		return nil, err
	}
	return &server{cfg: cfg, st: st, lib: lib, appHead: app[:i+6], appTail: app[i+6:], loginPage: lp,
		loginLim: newLimiter(5, 5*time.Minute), ipLim: newLimiter(30, 15*time.Minute)}, nil
}

func (s *server) routes() http.Handler {
	m := http.NewServeMux()
	m.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("ok")) })
	m.HandleFunc("GET /login", s.loginHTML)
	m.HandleFunc("GET /{$}", s.appHTML)
	m.HandleFunc("GET /logo.svg", func(w http.ResponseWriter, r *http.Request) {
		b, _ := assets.ReadFile("web/logo.svg")
		w.Header().Set("Content-Type", "image/svg+xml")
		w.Write(b)
	})

	m.HandleFunc("GET /api/config", func(w http.ResponseWriter, r *http.Request) {
		sendJSON(w, map[string]any{"signup": s.cfg.Signup || s.st.UserCount() == 0, "firstUser": s.st.UserCount() == 0, "version": version()})
	})
	m.HandleFunc("POST /api/signup", s.signup)
	m.HandleFunc("POST /api/login", s.login)
	m.HandleFunc("POST /api/logout", s.logout)
	m.HandleFunc("GET /api/me", s.auth(func(w http.ResponseWriter, r *http.Request, u *User) { sendJSON(w, UserInfo{u.ID, u.Name}) }))
	m.HandleFunc("POST /api/password", s.auth(s.changePassword))

	m.HandleFunc("GET /api/data/{name}", s.auth(s.readData))
	m.HandleFunc("PUT /api/data/{name}", s.auth(s.writeData))

	m.HandleFunc("GET /api/library", s.auth(func(w http.ResponseWriter, r *http.Request, u *User) { sendJSON(w, s.lib.Index()) }))
	m.HandleFunc("GET /api/library/status", s.auth(func(w http.ResponseWriter, r *http.Request, u *User) { sendJSON(w, s.lib.Status()) }))
	m.HandleFunc("POST /api/library/refresh", s.auth(func(w http.ResponseWriter, r *http.Request, u *User) {
		if !s.lib.StartRefresh() {
			sendErr(w, http.StatusConflict, "A library refresh is already running.")
			return
		}
		sendJSON(w, s.lib.Status())
	}))
	m.HandleFunc("GET /api/library/set/{folder}/{file}", s.auth(func(w http.ResponseWriter, r *http.Request, u *User) {
		s.serveLib(w, "vectors/set/"+r.PathValue("folder"), r.PathValue("file"))
	}))
	m.HandleFunc("GET /api/library/watermark/{file}", s.auth(func(w http.ResponseWriter, r *http.Request, u *User) {
		s.serveLib(w, "vectors/watermark", r.PathValue("file"))
	}))
	m.HandleFunc("GET /api/library/mana/{file}", s.auth(func(w http.ResponseWriter, r *http.Request, u *User) {
		s.serveLib(w, "mana", r.PathValue("file"))
	}))
	m.HandleFunc("GET /api/library/icon/{file}", s.auth(func(w http.ResponseWriter, r *http.Request, u *User) {
		s.serveLib(w, "icons", r.PathValue("file"))
	}))
	m.HandleFunc("GET /fonts/{family}/{file}", s.serveFont)
	return securityHeaders(csrfGuard(m))
}

var safeName = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9 &'._-]{0,80}$`)

func (s *server) serveLib(w http.ResponseWriter, dir, file string) {
	if !safeName.MatchString(file) || !strings.HasSuffix(strings.ToLower(file), ".svg") || strings.Contains(dir, "..") || strings.Contains(file, "..") {
		sendErr(w, http.StatusNotFound, "not found")
		return
	}
	for _, part := range strings.Split(dir, "/") {
		if part != "" && !safeName.MatchString(part) {
			sendErr(w, http.StatusNotFound, "not found")
			return
		}
	}
	b, err := s.lib.ReadFile(dir + "/" + file)
	if err != nil {
		sendErr(w, http.StatusNotFound, "not found")
		return
	}
	w.Header().Set("Content-Type", "image/svg+xml")
	w.Header().Set("Cache-Control", "private, max-age=300")
	// symbol files are only ever drawn by the program, never opened as pages; this keeps any script in them inert
	w.Header().Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'")
	w.Write(b)
}

func (s *server) serveFont(w http.ResponseWriter, r *http.Request) {
	fam, file := r.PathValue("family"), r.PathValue("file")
	if !safeName.MatchString(fam) || !safeName.MatchString(file) || strings.Contains(fam+file, "..") {
		http.NotFound(w, r)
		return
	}
	b, err := assets.ReadFile(path.Join("assets/fonts", fam, file))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	ct := "font/woff"
	if strings.HasSuffix(file, ".ttf") {
		ct = "font/ttf"
	} else if strings.HasSuffix(file, ".otf") {
		ct = "font/otf"
	}
	w.Header().Set("Content-Type", ct)
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Write(b)
}

// ---------- helpers ----------

func securityHeaders(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "same-origin")
		h.ServeHTTP(w, r)
	})
}

// csrfGuard: every request that changes something must carry the X-TopLabel header. Browsers do not let other
// sites add custom headers without a CORS preflight, which this server never allows.
func csrfGuard(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead && r.Header.Get("X-TopLabel") != "1" {
			sendErr(w, http.StatusForbidden, "missing request header")
			return
		}
		h.ServeHTTP(w, r)
	})
}

func sendJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	json.NewEncoder(w).Encode(v)
}

func sendErr(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func readBody(w http.ResponseWriter, r *http.Request) ([]byte, bool) {
	b, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBody))
	if err != nil {
		sendErr(w, http.StatusRequestEntityTooLarge, "The request is too large.")
		return nil, false
	}
	return b, true
}

func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	b, ok := readBody(w, r)
	if !ok {
		return false
	}
	if err := json.Unmarshal(b, v); err != nil {
		sendErr(w, http.StatusBadRequest, "bad request")
		return false
	}
	return true
}

func clientIP(r *http.Request) string {
	h, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return h
}

const cookieName = "toplabel_session"

func (s *server) secure(r *http.Request) bool {
	switch s.cfg.Secure {
	case "always", "true", "on":
		return true
	case "never", "false", "off":
		return false
	}
	return r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}

func (s *server) setCookie(w http.ResponseWriter, r *http.Request, tok string, maxAge int) {
	http.SetCookie(w, &http.Cookie{Name: cookieName, Value: tok, Path: "/", MaxAge: maxAge, HttpOnly: true, Secure: s.secure(r), SameSite: http.SameSiteLaxMode})
}

func (s *server) user(r *http.Request) *User {
	c, err := r.Cookie(cookieName)
	if err != nil {
		return nil
	}
	return s.st.Session(c.Value)
}

func (s *server) auth(h func(http.ResponseWriter, *http.Request, *User)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u := s.user(r)
		if u == nil {
			sendErr(w, http.StatusUnauthorized, "You are signed out.")
			return
		}
		h(w, r, u)
	}
}

func storeErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errNotFound):
		sendErr(w, http.StatusNotFound, "not found")
	default:
		log.Print(err)
		sendErr(w, http.StatusInternalServerError, "The server could not save the change.")
	}
}

// ---------- pages ----------

func (s *server) loginHTML(w http.ResponseWriter, r *http.Request) {
	if s.user(r) != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Write(s.loginPage)
}

func (s *server) appHTML(w http.ResponseWriter, r *http.Request) {
	u := s.user(r)
	if u == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	cfg, _ := json.Marshal(map[string]any{"user": UserInfo{u.ID, u.Name}})
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	js := strings.ReplaceAll(string(cfg), "<", "\\u003c")
	fmt.Fprintf(w, "%s<script>window.TL_SERVER=%s;</script>%s", s.appHead, js, s.appTail)
}

// ---------- accounts ----------

type credentials struct {
	Name     string `json:"name"`
	Password string `json:"password"`
}

func (s *server) signup(w http.ResponseWriter, r *http.Request) {
	// the first account can always be created, so a new server is usable without changing settings
	if !s.cfg.Signup && s.st.UserCount() > 0 {
		sendErr(w, http.StatusForbidden, "New accounts are turned off on this server.")
		return
	}
	var c credentials
	if !decode(w, r, &c) {
		return
	}
	c.Name = strings.TrimSpace(c.Name)
	if !validName(c.Name) {
		sendErr(w, http.StatusBadRequest, "User names are 3 to 32 letters, digits, dots, dashes or underscores, starting with a letter or digit.")
		return
	}
	if !validPassword(c.Password) {
		sendErr(w, http.StatusBadRequest, "Passwords need at least 8 characters.")
		return
	}
	ip := clientIP(r)
	if s.ipLim.Blocked(ip) {
		sendErr(w, http.StatusTooManyRequests, "Too many attempts. Try again in a few minutes.")
		return
	}
	s.ipLim.Hit(ip)
	u, err := s.st.AddUser(c.Name, c.Password)
	if errors.Is(err, errConflict) {
		sendErr(w, http.StatusConflict, "That user name is taken.")
		return
	}
	if err != nil {
		storeErr(w, err)
		return
	}
	s.startSession(w, r, u)
}

func (s *server) startSession(w http.ResponseWriter, r *http.Request, u *User) {
	tok, err := s.st.NewSession(u.ID)
	if err != nil {
		storeErr(w, err)
		return
	}
	s.setCookie(w, r, tok, int(sessionLife.Seconds()))
	sendJSON(w, UserInfo{u.ID, u.Name})
}

func (s *server) login(w http.ResponseWriter, r *http.Request) {
	var c credentials
	if !decode(w, r, &c) {
		return
	}
	key := strings.ToLower(strings.TrimSpace(c.Name))
	ip := clientIP(r)
	if s.loginLim.Blocked(key) || s.ipLim.Blocked(ip) {
		sendErr(w, http.StatusTooManyRequests, "Too many attempts. Try again in a few minutes.")
		return
	}
	u := s.st.CheckPassword(strings.TrimSpace(c.Name), c.Password)
	if u == nil {
		s.loginLim.Hit(key)
		s.ipLim.Hit(ip)
		sendErr(w, http.StatusUnauthorized, "Wrong user name or password.")
		return
	}
	s.loginLim.Reset(key)
	s.startSession(w, r, u)
}

func (s *server) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(cookieName); err == nil {
		s.st.EndSession(c.Value)
	}
	s.setCookie(w, r, "", -1)
	sendJSON(w, map[string]bool{"ok": true})
}

func (s *server) changePassword(w http.ResponseWriter, r *http.Request, u *User) {
	var c struct {
		Old string `json:"old"`
		New string `json:"new"`
	}
	if !decode(w, r, &c) {
		return
	}
	if s.loginLim.Blocked(strings.ToLower(u.Name)) {
		sendErr(w, http.StatusTooManyRequests, "Too many attempts. Try again in a few minutes.")
		return
	}
	if s.st.CheckPassword(u.Name, c.Old) == nil {
		s.loginLim.Hit(strings.ToLower(u.Name))
		sendErr(w, http.StatusUnauthorized, "The current password is wrong.")
		return
	}
	if !validPassword(c.New) {
		sendErr(w, http.StatusBadRequest, "Passwords need at least 8 characters.")
		return
	}
	if err := s.st.SetPassword(u.ID, c.New); err != nil {
		storeErr(w, err)
		return
	}
	s.startSession(w, r, u)
}

// ---------- data files ----------

func (s *server) readData(w http.ResponseWriter, r *http.Request, u *User) {
	b, err := s.st.ReadData(u.ID, r.PathValue("name"))
	if err != nil {
		storeErr(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	if len(b) == 0 {
		b = []byte("null")
	}
	w.Write(b)
}

func (s *server) writeData(w http.ResponseWriter, r *http.Request, u *User) {
	b, ok := readBody(w, r)
	if !ok {
		return
	}
	if !json.Valid(b) {
		sendErr(w, http.StatusBadRequest, "The data is not valid.")
		return
	}
	if err := s.st.WriteData(u.ID, r.PathValue("name"), b); err != nil {
		storeErr(w, err)
		return
	}
	sendJSON(w, map[string]bool{"ok": true})
}

// ---------- main ----------

func healthcheck(addr string) int {
	if strings.HasPrefix(addr, ":") {
		addr = "127.0.0.1" + addr
	}
	c := http.Client{Timeout: 3 * time.Second}
	res, err := c.Get("http://" + addr + "/healthz")
	if err != nil || res.StatusCode != 200 {
		return 1
	}
	return 0
}

func main() {
	hc := flag.Bool("healthcheck", false, "check that the server answers and exit")
	flag.Parse()
	cfg := loadConfig()
	if *hc {
		os.Exit(healthcheck(cfg.Addr))
	}
	s, err := newServer(cfg)
	if err != nil {
		log.Fatalf("TopLabel: %v", err)
	}
	if cfg.AutoRefresh && s.lib.Empty() {
		log.Print("TopLabel: the symbol library is empty, downloading it now")
		s.lib.StartRefresh()
	}
	srv := &http.Server{Addr: cfg.Addr, Handler: s.routes(), ReadHeaderTimeout: 10 * time.Second, IdleTimeout: 120 * time.Second}
	log.Printf("TopLabel %s listening on %s, data in %s, new accounts %s", version(), cfg.Addr, cfg.Data, map[bool]string{true: "on", false: "off"}[cfg.Signup])
	log.Fatal(srv.ListenAndServe())
}

// version reads APP_VERSION from the interface, so the server and the page always report the same number.
func version() string {
	b, _ := assets.ReadFile("ui/js/core.js")
	s := string(b)
	if i := strings.Index(s, "APP_VERSION = '"); i >= 0 {
		s = s[i+15:]
		if j := strings.Index(s, "'"); j >= 0 {
			return s[:j]
		}
	}
	return "?"
}
