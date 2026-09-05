package http

import (
	"encoding/base64"
	"net/http"

	qrcode "github.com/skip2/go-qrcode"

	"melu/internal/domain"
)

func (s *Server) rutasPanel() {
	m := s.mux
	m.Handle("GET /api/panel", s.conSesion(s.panel))
	m.Handle("GET /api/mi-progreso", s.conSesion(s.miProgreso))
	m.Handle("POST /api/actividades/{id}/plantilla", s.conSesion(s.plantilla))
	m.Handle("GET /api/grupos/{id}/invitacion", s.conSesion(s.invitacion))
}

func (s *Server) panel(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	out, err := s.svc.PanelDocente(r.Context(), p, r.URL.Query().Get("espacio"))
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, out)
}

func (s *Server) miProgreso(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	out, err := s.svc.MiProgreso(r.Context(), p)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, out)
}

func (s *Server) plantilla(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	a, err := s.svc.GuardarComoPlantilla(r.Context(), p, r.PathValue("id"))
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 201, a)
}

// invitacion devuelve el link de ingreso y un QR en PNG base64, para mostrar en pantalla o imprimir.
func (s *Server) invitacion(w http.ResponseWriter, r *http.Request, p domain.Persona) {
	g, _, _, err := s.svc.GrupoConDetalle(r.Context(), p, r.PathValue("id"))
	if err != nil {
		fallo(w, err)
		return
	}
	link := s.baseURL + "/unirme/" + g.Codigo
	png, err := qrcode.Encode(link, qrcode.Medium, 512)
	if err != nil {
		fallo(w, err)
		return
	}
	js(w, 200, map[string]any{"codigo": g.Codigo, "link": link, "qr": "data:image/png;base64," + base64.StdEncoding.EncodeToString(png), "grupo": g.Nombre})
}
