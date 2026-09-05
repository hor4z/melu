package http

import (
	"encoding/json"
	"net/http"

	"melu/internal/domain"
)

func (s *Server) profileRoutes() {
	m := s.mux
	m.Handle("GET /api/profile", s.withSession(s.myProfile))
	m.Handle("POST /api/profile", s.withSession(s.saveProfile))
	m.Handle("GET /api/groups/{id}/profiles", s.withSession(s.groupProfiles))
}

func (s *Server) myProfile(w http.ResponseWriter, r *http.Request, p domain.Person) {
	out, err := s.svc.MyProfile(r.Context(), p)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, out)
}

func (s *Server) saveProfile(w http.ResponseWriter, r *http.Request, p domain.Person) {
	var in struct {
		Answers map[string]string `json:"answers"`
	}
	if json.NewDecoder(r.Body).Decode(&in) != nil {
		http.Error(w, "invalid body", 400)
		return
	}
	out, err := s.svc.SaveProfile(r.Context(), p, in.Answers)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 201, out)
}

func (s *Server) groupProfiles(w http.ResponseWriter, r *http.Request, p domain.Person) {
	out, err := s.svc.GroupProfiles(r.Context(), p, r.PathValue("id"))
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, out)
}
