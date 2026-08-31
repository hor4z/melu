package http

import (
	"encoding/json"
	"net/http"
	"time"

	"melu/internal/domain"
)

func (s *Server) rutasProgramacion() {
	m := s.mux
	m.Handle("GET /api/programacion", s.conSesion(s.programacion))
	m.Handle("PUT /api/asignaciones/{id}/fechas", s.conSesion(s.reprogramar))
	m.Handle("DELETE /api/series/{id}", s.conSesion(s.cortarSerie))
}

func (s *Server) programacion(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	desde, hasta, err := rango(r)
	if err != nil {
		fallo(w, err)
		return
	}
	out, err := s.svc.VerProgramacion(r.Context(), p, r.URL.Query().Get("espacio"), desde, hasta)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, out)
}

func (s *Server) reprogramar(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	var in struct {
		Abre   time.Time  `json:"abre"`
		Cierra *time.Time `json:"cierra"`
	}
	if json.NewDecoder(r.Body).Decode(&in) != nil || in.Abre.IsZero() {
		fallo(w, domain.ErrInvalido)
		return
	}
	a, err := s.svc.Reprogramar(r.Context(), p, r.PathValue("id"), in.Abre, in.Cierra)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, a)
}

func (s *Server) cortarSerie(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	desde := time.Now()
	if v := r.URL.Query().Get("desde"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			fallo(w, domain.ErrInvalido)
			return
		}
		desde = t
	}
	c, err := s.svc.CortarSerie(r.Context(), p, r.PathValue("id"), desde)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, c)
}

// rango parsea ?desde=&hasta= como instantes RFC3339. Los calcula el navegador, que es el único
// que sabe en qué zona está mirando quien pregunta; el servidor no adivina bordes de día.
// Sin parámetros, las próximas cuatro semanas desde ahora.
func rango(r *http.Request) (time.Time, time.Time, error) {
	q := r.URL.Query()
	desde, hasta := time.Now(), time.Now().AddDate(0, 0, 28)
	if v := q.Get("desde"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			return desde, hasta, domain.ErrInvalido
		}
		desde = t
	}
	if v := q.Get("hasta"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			return desde, hasta, domain.ErrInvalido
		}
		hasta = t
	}
	return desde, hasta, nil
}
