package http

import (
	"encoding/json"
	"net/http"

	"melu/internal/app"
	"melu/internal/domain"
)

func (s *Server) contentRoutes() {
	m := s.mux
	m.Handle("POST /api/join", s.withSession(s.join))
	m.Handle("GET /api/today", s.withSession(s.today))
	m.Handle("GET /api/missions/{id}", s.withSession(s.mission))
	m.Handle("PUT /api/submissions/{id}", s.withSession(s.saveSubmission))
	m.Handle("PUT /api/submissions/{id}/scores", s.withSession(s.score))

	m.Handle("GET /api/activities", s.withSession(s.library))
	m.Handle("POST /api/activities", s.withSession(s.createActivity))
	m.Handle("GET /api/activities/{id}", s.withSession(s.activity))
	m.Handle("PUT /api/activities/{id}", s.withSession(s.saveActivity))
	m.Handle("POST /api/activities/{id}/assign", s.withSession(s.assign))
	m.Handle("GET /api/assignments/{id}/submissions", s.withSession(s.submissions))
	m.Handle("GET /api/groups/{id}/detail", s.withSession(s.groupDetail))
}

func (s *Server) join(w http.ResponseWriter, r *http.Request, p domain.Person) {
	var in struct {
		Code string `json:"code"`
	}
	json.NewDecoder(r.Body).Decode(&in)
	g, err := s.svc.Join(r.Context(), p, in.Code)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, g)
}

func (s *Server) today(w http.ResponseWriter, r *http.Request, p domain.Person) {
	rooms, err := s.svc.Today(r.Context(), p)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, rooms)
}

func (s *Server) mission(w http.ResponseWriter, r *http.Request, p domain.Person) {
	m, err := s.svc.OpenMission(r.Context(), p, r.PathValue("id"))
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, m)
}

func (s *Server) saveSubmission(w http.ResponseWriter, r *http.Request, p domain.Person) {
	var in struct {
		Answers json.RawMessage `json:"answers"`
		Steps   json.RawMessage `json:"steps"`
		Submit  bool            `json:"submit"`
	}
	json.NewDecoder(r.Body).Decode(&in)
	if in.Answers == nil {
		in.Answers = json.RawMessage(`{}`)
	}
	e, err := s.svc.SaveAnswers(r.Context(), p, r.PathValue("id"), in.Answers, in.Steps, in.Submit)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, e)
}

func (s *Server) score(w http.ResponseWriter, r *http.Request, p domain.Person) {
	var in struct {
		Scores json.RawMessage `json:"scores"`
	}
	json.NewDecoder(r.Body).Decode(&in)
	if err := s.svc.ScoreSubmission(r.Context(), p, r.PathValue("id"), in.Scores); err != nil {
		fail(w, err)
		return
	}
	js(w, 200, map[string]any{"ok": true})
}

func (s *Server) library(w http.ResponseWriter, r *http.Request, p domain.Person) {
	recipes, mine, err := s.svc.Library(r.Context(), p, r.URL.Query().Get("space"))
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, map[string]any{"recipes": recipes, "mine": mine})
}

func (s *Server) createActivity(w http.ResponseWriter, r *http.Request, p domain.Person) {
	var in app.NewActivity
	json.NewDecoder(r.Body).Decode(&in)
	a, err := s.svc.CreateActivity(r.Context(), p, in)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 201, a)
}

func (s *Server) activity(w http.ResponseWriter, r *http.Request, p domain.Person) {
	a, err := s.svc.ViewActivity(r.Context(), p, r.PathValue("id"))
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, a)
}

func (s *Server) saveActivity(w http.ResponseWriter, r *http.Request, p domain.Person) {
	var a domain.Activity
	if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
		http.Error(w, "invalid json", 400)
		return
	}
	a.ID = r.PathValue("id")
	if err := s.svc.SaveActivity(r.Context(), p, a); err != nil {
		fail(w, err)
		return
	}
	js(w, 200, map[string]any{"ok": true})
}

func (s *Server) assign(w http.ResponseWriter, r *http.Request, p domain.Person) {
	var in struct {
		GroupID string `json:"groupId"`
	}
	json.NewDecoder(r.Body).Decode(&in)
	a, err := s.svc.Assign(r.Context(), p, r.PathValue("id"), in.GroupID)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 201, a)
}

func (s *Server) submissions(w http.ResponseWriter, r *http.Request, p domain.Person) {
	a, es, err := s.svc.SubmissionsOf(r.Context(), p, r.PathValue("id"))
	if err != nil {
		fail(w, err)
		return
	}
	if es == nil {
		es = []domain.Submission{}
	}
	js(w, 200, map[string]any{"assignment": a, "submissions": es})
}

func (s *Server) groupDetail(w http.ResponseWriter, r *http.Request, p domain.Person) {
	g, as, ap, err := s.svc.GroupDetail(r.Context(), p, r.PathValue("id"))
	if err != nil {
		fail(w, err)
		return
	}
	if as == nil {
		as = []domain.Assignment{}
	}
	if ap == nil {
		ap = []domain.Learner{}
	}
	js(w, 200, map[string]any{"group": g, "assignments": as, "learners": ap})
}
