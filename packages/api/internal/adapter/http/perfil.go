package http

import (
	"encoding/json"
	"net/http"

	"melu/internal/domain"
)

func (s *Server) rutasPerfil() {
	m := s.mux
	m.Handle("GET /api/perfil", s.conSesion(s.miPerfil))
	m.Handle("POST /api/perfil", s.conSesion(s.guardarPerfil))
	m.Handle("GET /api/grupos/{id}/perfiles", s.conSesion(s.perfilesDeGrupo))
}

func (s *Server) miPerfil(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	out, err := s.svc.MiPerfil(r.Context(), p)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, out)
}

func (s *Server) guardarPerfil(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	var in struct {
		Respuestas map[string]string `json:"respuestas"`
	}
	if json.NewDecoder(r.Body).Decode(&in) != nil {
		http.Error(w, "cuerpo inválido", 400)
		return
	}
	out, err := s.svc.GuardarPerfil(r.Context(), p, in.Respuestas)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 201, out)
}

func (s *Server) perfilesDeGrupo(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	out, err := s.svc.PerfilesDeGrupo(r.Context(), p, r.PathValue("id"))
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, out)
}
