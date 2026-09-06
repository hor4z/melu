package http

import (
	"net/http"

	"melu/internal/domain"
)

func (s *Server) dashboardRoutes() {
	m := s.mux
	m.Handle("GET /api/dashboard", s.withSession(s.panel))
	m.Handle("GET /api/submissions", s.withSession(s.allSubmissions))
	m.Handle("GET /api/my-progress", s.withSession(s.myProgress))
	m.Handle("POST /api/activities/{id}/template", s.withSession(s.template))
}

func (s *Server) panel(w http.ResponseWriter, r *http.Request, p domain.Person) {
	out, err := s.svc.PanelDocente(r.Context(), p, r.URL.Query().Get("space"))
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, out)
}

func (s *Server) allSubmissions(w http.ResponseWriter, r *http.Request, p domain.Person) {
	out, err := s.svc.AllSubmissions(r.Context(), p, r.URL.Query().Get("space"))
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, out)
}

func (s *Server) myProgress(w http.ResponseWriter, r *http.Request, p domain.Person) {
	out, err := s.svc.MiProgreso(r.Context(), p)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, out)
}

func (s *Server) template(w http.ResponseWriter, r *http.Request, p domain.Person) {
	a, err := s.svc.SaveAsTemplate(r.Context(), p, r.PathValue("id"))
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 201, a)
}
