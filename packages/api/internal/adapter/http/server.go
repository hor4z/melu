package http

import (
	"context"
	"crypto/rand"
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
	svc      *app.Services
	google   *google.Client // nil = apagado
	devLogin bool
	web      fs.FS // Vite build, may be nil in dev
	baseURL  string
	mux      *http.ServeMux
}

func New(svc *app.Services, g *google.Client, devLogin bool, web fs.FS, baseURL string) *Server {
	s := &Server{svc: svc, google: g, devLogin: devLogin, web: web, baseURL: baseURL, mux: http.NewServeMux()}
	s.routes()
	return s
}

func (s *Server) Handler() http.Handler { return logging(s.mux) }

func (s *Server) routes() {
	m := s.mux
	m.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) { js(w, 200, map[string]any{"ok": true}) })
	m.HandleFunc("GET /api/auth/options", s.authOptions)
	m.HandleFunc("GET /api/auth/google", s.authGoogle)
	m.HandleFunc("GET /api/auth/google/callback", s.authGoogleCallback)
	m.HandleFunc("POST /api/auth/dev", s.authDev)
	m.HandleFunc("POST /api/auth/logout", s.logout)

	m.Handle("GET /api/me", s.withSession(s.yo))
	m.Handle("GET /api/lenses", s.withSession(s.lenses))
	m.Handle("POST /api/spaces", s.withSession(s.createSpace))
	m.Handle("GET /api/groups", s.withSession(s.groups))
	m.Handle("POST /api/groups", s.withSession(s.createGroup))
	m.Handle("GET /api/groups/{id}", s.withSession(s.group))

	s.contentRoutes()
	s.dashboardRoutes()
	s.profileRoutes()

	if s.web != nil {
		m.Handle("/", spa(s.web))
	}
}

// ---- auth ----
func (s *Server) authOptions(w http.ResponseWriter, r *http.Request) {
	js(w, 200, map[string]any{"google": s.google != nil, "dev": s.devLogin})
}

func (s *Server) authGoogle(w http.ResponseWriter, r *http.Request) {
	if s.google == nil {
		http.Error(w, "Google sign-in not configured", 503)
		return
	}
	b := make([]byte, 16)
	rand.Read(b)
	state := hex.EncodeToString(b)
	http.SetCookie(w, &http.Cookie{Name: "oauth_state", Value: state, Path: "/", HttpOnly: true, MaxAge: 600, SameSite: http.SameSiteLaxMode})
	http.Redirect(w, r, s.google.URL(state), http.StatusFound)
}

func (s *Server) authGoogleCallback(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie("oauth_state")
	if err != nil || c.Value != r.URL.Query().Get("state") {
		http.Error(w, "invalid state", 400)
		return
	}
	id, err := s.google.Exchange(r.Context(), r.URL.Query().Get("code"))
	if err != nil {
		http.Error(w, "could not sign in with Google: "+err.Error(), 401)
		return
	}
	tok, err := s.svc.SignInWithIdentity(r.Context(), id.Sub, id.Email, id.Name)
	if err != nil {
		fail(w, err)
		return
	}
	setSession(w, tok)
	http.Redirect(w, r, "/", http.StatusFound)
}

// authDev signs in with any email. Only with MELU_DEV_LOGIN=1.
func (s *Server) authDev(w http.ResponseWriter, r *http.Request) {
	if !s.devLogin {
		http.NotFound(w, r)
		return
	}
	var in struct{ Email, Name string }
	if json.NewDecoder(r.Body).Decode(&in) != nil || !strings.Contains(in.Email, "@") {
		http.Error(w, "invalid email", 400)
		return
	}
	tok, err := s.svc.SignInWithIdentity(r.Context(), "dev:"+in.Email, in.Email, in.Name)
	if err != nil {
		fail(w, err)
		return
	}
	setSession(w, tok)
	js(w, 200, map[string]any{"ok": true})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie("melu_session"); err == nil {
		s.svc.Sessions.Delete(r.Context(), c.Value)
	}
	http.SetCookie(w, &http.Cookie{Name: "melu_session", Value: "", Path: "/", MaxAge: -1})
	js(w, 200, map[string]any{"ok": true})
}

func setSession(w http.ResponseWriter, tok string) {
	http.SetCookie(w, &http.Cookie{Name: "melu_session", Value: tok, Path: "/", HttpOnly: true, SameSite: http.SameSiteLaxMode, MaxAge: 30 * 24 * 3600})
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
		SpaceID string `json:"spaceId"`
		Name    string `json:"name"`
	}
	json.NewDecoder(r.Body).Decode(&in)
	g, err := s.svc.CreateGroup(r.Context(), p, in.SpaceID, in.Name)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 201, g)
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
