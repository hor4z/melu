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
	svc      *app.Servicios
	google   *google.Cliente // nil = apagado
	devLogin bool
	web      fs.FS // build de Vite, puede ser nil en dev
	baseURL  string
	mux      *http.ServeMux
}

func New(svc *app.Servicios, g *google.Cliente, devLogin bool, web fs.FS, baseURL string) *Server {
	s := &Server{svc: svc, google: g, devLogin: devLogin, web: web, baseURL: baseURL, mux: http.NewServeMux()}
	s.rutas()
	return s
}

func (s *Server) Handler() http.Handler { return logging(s.mux) }

func (s *Server) rutas() {
	m := s.mux
	m.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) { js(w, 200, map[string]any{"ok": true}) })
	m.HandleFunc("GET /api/auth/opciones", s.authOpciones)
	m.HandleFunc("GET /api/auth/google", s.authGoogle)
	m.HandleFunc("GET /api/auth/google/callback", s.authGoogleCallback)
	m.HandleFunc("POST /api/auth/dev", s.authDev)
	m.HandleFunc("POST /api/auth/salir", s.salir)

	m.Handle("GET /api/yo", s.conSesion(s.yo))
	m.Handle("GET /api/lentes", s.conSesion(s.lentes))
	m.Handle("POST /api/espacios", s.conSesion(s.crearEspacio))
	m.Handle("GET /api/grupos", s.conSesion(s.grupos))
	m.Handle("POST /api/grupos", s.conSesion(s.crearGrupo))
	m.Handle("GET /api/grupos/{id}", s.conSesion(s.grupo))

	s.rutasContenido()
	s.rutasPanel()

	if s.web != nil {
		m.Handle("/", spa(s.web))
	}
}

// ---- auth ----
func (s *Server) authOpciones(w http.ResponseWriter, r *http.Request) {
	js(w, 200, map[string]any{"google": s.google != nil, "dev": s.devLogin})
}

func (s *Server) authGoogle(w http.ResponseWriter, r *http.Request) {
	if s.google == nil {
		http.Error(w, "login con Google no configurado", 503)
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
		http.Error(w, "state inválido", 400)
		return
	}
	id, err := s.google.Canjear(r.Context(), r.URL.Query().Get("code"))
	if err != nil {
		http.Error(w, "no se pudo entrar con Google: "+err.Error(), 401)
		return
	}
	tok, err := s.svc.EntrarConIdentidad(r.Context(), id.Sub, id.Email, id.Nombre)
	if err != nil {
		fallo(w, err)
		return
	}
	setSesion(w, tok)
	http.Redirect(w, r, "/", http.StatusFound)
}

// authDev entra con un email cualquiera. Solo con MELU_DEV_LOGIN=1.
func (s *Server) authDev(w http.ResponseWriter, r *http.Request) {
	if !s.devLogin {
		http.NotFound(w, r)
		return
	}
	var in struct{ Email, Nombre string }
	if json.NewDecoder(r.Body).Decode(&in) != nil || !strings.Contains(in.Email, "@") {
		http.Error(w, "email inválido", 400)
		return
	}
	tok, err := s.svc.EntrarConIdentidad(r.Context(), "dev:"+in.Email, in.Email, in.Nombre)
	if err != nil {
		fallo(w, err)
		return
	}
	setSesion(w, tok)
	js(w, 200, map[string]any{"ok": true})
}

func (s *Server) salir(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie("melu_sesion"); err == nil {
		s.svc.Sesiones.Borrar(r.Context(), c.Value)
	}
	http.SetCookie(w, &http.Cookie{Name: "melu_sesion", Value: "", Path: "/", MaxAge: -1})
	js(w, 200, map[string]any{"ok": true})
}

func setSesion(w http.ResponseWriter, tok string) {
	http.SetCookie(w, &http.Cookie{Name: "melu_sesion", Value: tok, Path: "/", HttpOnly: true, SameSite: http.SameSiteLaxMode, MaxAge: 30 * 24 * 3600})
}

// ---- sesión ----
type ctxKey struct{}

func (s *Server) conSesion(h func(http.ResponseWriter, *http.Request, domain.Persona)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie("melu_sesion")
		if err != nil {
			http.Error(w, "sin sesión", 401)
			return
		}
		p, err := s.svc.Sesiones.Resolver(r.Context(), c.Value)
		if err != nil {
			http.Error(w, "sesión inválida", 401)
			return
		}
		h(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, p)), *p)
	})
}

// ---- recursos ----
func (s *Server) yo(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	c, err := s.svc.Yo2(r.Context(), p)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, c)
}

func (s *Server) lentes(w http.ResponseWriter, r *http.Request, _ domain.Persona) {
	l, err := s.svc.Lentes.Todos(r.Context())
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, l)
}

func (s *Server) crearEspacio(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	var in struct{ Nombre, Tipo string }
	json.NewDecoder(r.Body).Decode(&in)
	e, err := s.svc.CrearEspacio(r.Context(), p, in.Nombre, in.Tipo)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 201, e)
}

func (s *Server) grupos(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	g, err := s.svc.Grupos.DeGuia(r.Context(), p.ID, r.URL.Query().Get("espacio"))
	if err != nil {
		fallo(w, err)
		return
	}
	if g == nil {
		g = []domain.Grupo{}
	}
	js(w, 200, g)
}

func (s *Server) crearGrupo(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	var in struct {
		EspacioID string `json:"espacioId"`
		Nombre    string `json:"nombre"`
	}
	json.NewDecoder(r.Body).Decode(&in)
	g, err := s.svc.CrearGrupo(r.Context(), p, in.EspacioID, in.Nombre)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 201, g)
}

func (s *Server) grupo(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	g, err := s.svc.Grupos.PorID(r.Context(), r.PathValue("id"))
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, g)
}

// ---- utilidades ----
func js(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func fallo(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrNoEncontrado):
		http.Error(w, "no encontrado", 404)
	case errors.Is(err, domain.ErrNoAutorizado):
		http.Error(w, "no autorizado", 403)
	case errors.Is(err, domain.ErrInvalido):
		http.Error(w, "datos inválidos", 400)
	default:
		slog.Error("error interno", "err", err)
		http.Error(w, "error interno", 500)
	}
}

// spa sirve archivos estáticos y cae a index.html para rutas del router.
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
