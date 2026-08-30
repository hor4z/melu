package http

import (
	"encoding/json"
	"net/http"

	"melu/internal/app"
	"melu/internal/domain"
)

func (s *Server) rutasContenido() {
	m := s.mux
	m.Handle("POST /api/unirme", s.conSesion(s.unirme))
	m.Handle("GET /api/hoy", s.conSesion(s.hoy))
	m.Handle("GET /api/misiones/{id}", s.conSesion(s.mision))
	m.Handle("PUT /api/entregas/{id}", s.conSesion(s.guardarEntrega))
	m.Handle("PUT /api/entregas/{id}/puntajes", s.conSesion(s.puntuar))

	m.Handle("GET /api/actividades", s.conSesion(s.biblioteca))
	m.Handle("POST /api/actividades", s.conSesion(s.crearActividad))
	m.Handle("GET /api/actividades/{id}", s.conSesion(s.actividad))
	m.Handle("PUT /api/actividades/{id}", s.conSesion(s.guardarActividad))
	m.Handle("POST /api/actividades/{id}/asignar", s.conSesion(s.asignar))
	m.Handle("GET /api/asignaciones/{id}/entregas", s.conSesion(s.entregas))
	m.Handle("GET /api/grupos/{id}/detalle", s.conSesion(s.grupoDetalle))
}

func (s *Server) unirme(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	var in struct {
		Codigo string `json:"codigo"`
	}
	json.NewDecoder(r.Body).Decode(&in)
	g, err := s.svc.Unirme(r.Context(), p, in.Codigo)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, g)
}

func (s *Server) hoy(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	salas, err := s.svc.Hoy(r.Context(), p)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, salas)
}

func (s *Server) mision(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	m, err := s.svc.AbrirMision(r.Context(), p, r.PathValue("id"))
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, m)
}

func (s *Server) guardarEntrega(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	var in struct {
		Respuestas json.RawMessage `json:"respuestas"`
		Entregar   bool            `json:"entregar"`
	}
	json.NewDecoder(r.Body).Decode(&in)
	if in.Respuestas == nil {
		in.Respuestas = json.RawMessage(`{}`)
	}
	e, err := s.svc.GuardarRespuestas(r.Context(), p, r.PathValue("id"), in.Respuestas, in.Entregar)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, e)
}

func (s *Server) puntuar(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	var in struct {
		Puntajes json.RawMessage `json:"puntajes"`
	}
	json.NewDecoder(r.Body).Decode(&in)
	if err := s.svc.Puntuar(r.Context(), p, r.PathValue("id"), in.Puntajes); err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, map[string]any{"ok": true})
}

func (s *Server) biblioteca(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	recetas, mias, err := s.svc.Biblioteca(r.Context(), p)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, map[string]any{"recetas": recetas, "mias": mias})
}

func (s *Server) crearActividad(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	var in app.NuevaActividad
	json.NewDecoder(r.Body).Decode(&in)
	a, err := s.svc.CrearActividad(r.Context(), p, in)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 201, a)
}

func (s *Server) actividad(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	a, err := s.svc.VerActividad(r.Context(), p, r.PathValue("id"))
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, a)
}

func (s *Server) guardarActividad(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	var a domain.Actividad
	if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
		http.Error(w, "json inválido", 400)
		return
	}
	a.ID = r.PathValue("id")
	if err := s.svc.GuardarActividad(r.Context(), p, a); err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, map[string]any{"ok": true})
}

func (s *Server) asignar(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	var in struct {
		GrupoID string `json:"grupoId"`
	}
	json.NewDecoder(r.Body).Decode(&in)
	a, err := s.svc.Asignar(r.Context(), p, r.PathValue("id"), in.GrupoID)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 201, a)
}

func (s *Server) entregas(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	a, es, err := s.svc.EntregasDe(r.Context(), p, r.PathValue("id"))
	if err != nil {
		fallo(w, err)
		return
	}
	if es == nil {
		es = []domain.Entrega{}
	}
	js(w, 200, map[string]any{"asignacion": a, "entregas": es})
}

func (s *Server) grupoDetalle(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	g, as, ap, err := s.svc.GrupoConDetalle(r.Context(), p, r.PathValue("id"))
	if err != nil {
		fallo(w, err)
		return
	}
	if as == nil {
		as = []domain.Asignacion{}
	}
	if ap == nil {
		ap = []domain.Aprendiz{}
	}
	js(w, 200, map[string]any{"grupo": g, "asignaciones": as, "aprendices": ap})
}
