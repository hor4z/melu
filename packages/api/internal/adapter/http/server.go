package http

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"melu/internal/adapter/google"
	"melu/internal/app"
	"melu/internal/domain"
)

type Server struct {
	svc    *app.Services
	google *google.Client
	web    fs.FS // Vite build, may be nil in dev
	// secure marks the cookies when melu is served over https. Deriving it from the base URL
	// keeps local development working over plain http without a second flag to forget.
	secure bool
	mux    *http.ServeMux
}

func New(svc *app.Services, g *google.Client, web fs.FS, baseURL string) *Server {
	s := &Server{svc: svc, google: g, web: web, secure: strings.HasPrefix(baseURL, "https://"), mux: http.NewServeMux()}
	s.routes()
	return s
}

func (s *Server) Handler() http.Handler { return logging(s.mux) }

func (s *Server) routes() {
	m := s.mux
	m.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) { js(w, 200, map[string]any{"ok": true}) })
	m.HandleFunc("GET /api/auth/google", s.authGoogle)
	m.HandleFunc("GET /api/auth/google/callback", s.authGoogleCallback)
	m.HandleFunc("POST /api/auth/logout", s.logout)

	m.Handle("GET /api/me", s.withSession(s.yo))
	m.Handle("PUT /api/me", s.withSession(s.updateMe))
	m.Handle("GET /api/lenses", s.withSession(s.lenses))
	m.Handle("POST /api/spaces", s.withSession(s.createSpace))
	m.Handle("GET /api/groups", s.withSession(s.groups))
	m.Handle("POST /api/groups", s.withSession(s.createGroup))
	m.Handle("GET /api/groups/{id}", s.withSession(s.group))
	m.Handle("PATCH /api/groups/{id}", s.withSession(s.updateGroup))

	s.contentRoutes()
	s.dashboardRoutes()

	if s.web != nil {
		m.Handle("/", spa(s.web))
	}
}

// ---- auth ----

// oauthCookie carries three things across the round trip to Google: the state, the nonce, and
// where the person was headed. It has to survive the trip in the browser because the callback
// arrives on a fresh request with nothing else to tie it to the one that started the flow.
const oauthCookie = "oauth_flow"

func (s *Server) authGoogle(w http.ResponseWriter, r *http.Request) {
	state, nonce := token16(), token16()
	// `next` is where to come back to. Only a path: an absolute URL here would turn the sign-in
	// into an open redirect, handing anybody a melu link that lands somewhere else.
	next := safeNext(r.URL.Query().Get("next"))
	s.setCookie(w, &http.Cookie{Name: oauthCookie, Value: state + "|" + nonce + "|" + next, HttpOnly: true, MaxAge: 600})
	http.Redirect(w, r, s.google.URL(state, nonce), http.StatusFound)
}

func (s *Server) authGoogleCallback(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie(oauthCookie)
	if err != nil {
		http.Error(w, "invalid state", 400)
		return
	}
	// Spent on arrival, whatever happens next: leaving it alive would let the same state be
	// replayed for the ten minutes it lasts.
	s.setCookie(w, &http.Cookie{Name: oauthCookie, Value: "", MaxAge: -1})

	parts := strings.SplitN(c.Value, "|", 3)
	if len(parts) != 3 || subtle.ConstantTimeCompare([]byte(parts[0]), []byte(r.URL.Query().Get("state"))) != 1 {
		http.Error(w, "invalid state", 400)
		return
	}
	id, err := s.google.Exchange(r.Context(), r.URL.Query().Get("code"), parts[1])
	if err != nil {
		http.Error(w, "could not sign in with Google: "+err.Error(), 401)
		return
	}
	tok, err := s.svc.SignInWithIdentity(r.Context(), id.Sub, id.Email, id.Name, id.Picture)
	if err != nil {
		fail(w, err)
		return
	}
	s.setSession(w, tok)
	http.Redirect(w, r, safeNext(parts[2]), http.StatusFound)
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie("melu_session"); err == nil {
		// If the row survives, the cookie is gone from the browser but the token is still good
		// for thirty days. Worth saying out loud rather than dropping.
		if err := s.svc.Sessions.Delete(r.Context(), c.Value); err != nil {
			slog.Error("the session could not be deleted, the token stays valid", "err", err)
		}
	}
	s.setCookie(w, &http.Cookie{Name: "melu_session", Value: "", MaxAge: -1})
	js(w, 200, map[string]any{"ok": true})
}

func (s *Server) setSession(w http.ResponseWriter, tok string) {
	s.setCookie(w, &http.Cookie{Name: "melu_session", Value: tok, HttpOnly: true, MaxAge: 30 * 24 * 3600})
}

// setCookie fills in what every cookie melu sets has in common, so `Secure` cannot be forgotten
// on one of them.
func (s *Server) setCookie(w http.ResponseWriter, c *http.Cookie) {
	c.Path = "/"
	c.Secure = s.secure
	c.SameSite = http.SameSiteLaxMode
	http.SetCookie(w, c)
}

func token16() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// safeNext keeps only a path into the app. Anything else falls back to the root: an absolute
// URL would turn signing in into an open redirect, a protocol-relative `//host` is an absolute
// URL wearing a disguise, and `/api/...` sends the browser back to the endpoint that starts the
// sign-in, which loops.
func safeNext(next string) string {
	if !strings.HasPrefix(next, "/") || strings.HasPrefix(next, "//") || strings.HasPrefix(next, "/api/") {
		return "/"
	}
	return next
}

// ---- session ----
type ctxKey struct{}

func (s *Server) withSession(h func(http.ResponseWriter, *http.Request, domain.Person)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie("melu_session")
		if err != nil {
			http.Error(w, "no session", 401)
			return
		}
		p, err := s.svc.Sessions.Resolve(r.Context(), c.Value)
		if err != nil {
			http.Error(w, "invalid session", 401)
			return
		}
		h(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, p)), *p)
	})
}

// ---- resources ----
func (s *Server) yo(w http.ResponseWriter, r *http.Request, p domain.Person) {
	c, err := s.svc.Me(r.Context(), p)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, c)
}

func (s *Server) updateMe(w http.ResponseWriter, r *http.Request, p domain.Person) {
	var in domain.Person
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid data", 400)
		return
	}
	up, err := s.svc.UpdateMe(r.Context(), p, in)
	if err != nil {
		fail(w, err)
		return
	}
	c, err := s.svc.Me(r.Context(), *up)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, c)
}

func (s *Server) lenses(w http.ResponseWriter, r *http.Request, _ domain.Person) {
	l, err := s.svc.Lenses.All(r.Context())
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, l)
}

func (s *Server) createSpace(w http.ResponseWriter, r *http.Request, p domain.Person) {
	var in struct{ Name, Kind string }
	json.NewDecoder(r.Body).Decode(&in)
	e, err := s.svc.CreateSpace(r.Context(), p, in.Name, in.Kind)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 201, e)
}

func (s *Server) groups(w http.ResponseWriter, r *http.Request, p domain.Person) {
	g, err := s.svc.Groups.OfGuide(r.Context(), p.ID, r.URL.Query().Get("space"))
	if err != nil {
		fail(w, err)
		return
	}
	if g == nil {
		g = []domain.Group{}
	}
	js(w, 200, g)
}

func (s *Server) createGroup(w http.ResponseWriter, r *http.Request, p domain.Person) {
	var in struct {
		SpaceID     string `json:"spaceId"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	json.NewDecoder(r.Body).Decode(&in)
	g, err := s.svc.CreateGroup(r.Context(), p, in.SpaceID, in.Name, in.Description)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 201, g)
}

func (s *Server) updateGroup(w http.ResponseWriter, r *http.Request, p domain.Person) {
	var in struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	json.NewDecoder(r.Body).Decode(&in)
	g, err := s.svc.UpdateGroup(r.Context(), p, r.PathValue("id"), in.Name, in.Description)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, g)
}

func (s *Server) group(w http.ResponseWriter, r *http.Request, p domain.Person) {
	g, err := s.svc.Groups.ByID(r.Context(), r.PathValue("id"))
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, g)
}

// ---- helpers ----
func js(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func fail(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		http.Error(w, "not found", 404)
	case errors.Is(err, domain.ErrNotAllowed):
		http.Error(w, "not allowed", 403)
	case errors.Is(err, domain.ErrInvalid):
		http.Error(w, "invalid data", 400)
	default:
		slog.Error("internal error", "err", err)
		http.Error(w, "internal error", 500)
	}
}

// spa serves static files and falls back to index.html for router routes.
func spa(root fs.FS) http.Handler {
	files := http.FileServer(http.FS(root))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Una ruta de `/api` que llega hasta acá es una ruta que no existe, o un método que esa
		// ruta no acepta. Sin esto se le contesta el index.html con un 200, y quien llama se
		// entera recién cuando intenta parsear HTML como JSON.
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}
		p := strings.TrimPrefix(r.URL.Path, "/")
		if p == "" {
			p = "index.html"
		}
		if _, err := fs.Stat(root, p); err != nil {
			r.URL.Path = "/"
		}
		files.ServeHTTP(w, r)
	})
}

func logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t := time.Now()
		next.ServeHTTP(w, r)
		if strings.HasPrefix(r.URL.Path, "/api") {
			slog.Info(r.Method+" "+r.URL.Path, "ms", time.Since(t).Milliseconds())
		}
	})
}
