package http

import (
	"encoding/base64"
	"net/http"

	qrcode "github.com/skip2/go-qrcode"

	"melu/internal/domain"
)

func (s *Server) dashboardRoutes() {
	m := s.mux
	m.Handle("GET /api/dashboard", s.withSession(s.panel))
	m.Handle("GET /api/my-progress", s.withSession(s.myProgress))
	m.Handle("POST /api/activities/{id}/template", s.withSession(s.template))
	m.Handle("GET /api/groups/{id}/invite", s.withSession(s.invite))
}

func (s *Server) panel(w http.ResponseWriter, r *http.Request, p domain.Person) {
	out, err := s.svc.PanelDocente(r.Context(), p, r.URL.Query().Get("space"))
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

// invite returns the join link and a base64 PNG QR, to show on screen or print.
func (s *Server) invite(w http.ResponseWriter, r *http.Request, p domain.Person) {
	g, _, _, err := s.svc.GroupDetail(r.Context(), p, r.PathValue("id"))
	if err != nil {
		fail(w, err)
		return
	}
	link := s.baseURL + "/join/" + g.Code
	png, err := qrcode.Encode(link, qrcode.Medium, 512)
	if err != nil {
		fail(w, err)
		return
	}
	js(w, 200, map[string]any{"code": g.Code, "link": link, "qr": "data:image/png;base64," + base64.StdEncoding.EncodeToString(png), "group": g.Name})
}
