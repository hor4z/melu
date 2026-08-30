package app

import (
	"context"
	"encoding/json"
	"time"

	"melu/internal/domain"
)

// ---- lo que ve una persona al entrar ----

type Yo2 struct {
	Persona    domain.Persona     `json:"persona"`
	Modo       string             `json:"modo"` // guia | aprendiz | nuevo
	Espacios   []domain.Espacio   `json:"espacios"`
	Membresias []domain.Membresia `json:"membresias"`
}

func (s *Servicios) Yo2(ctx context.Context, p domain.Persona) (*Yo2, error) {
	c, err := s.Yo(ctx, p)
	if err != nil {
		return nil, err
	}
	modo := "nuevo"
	for _, m := range c.Membresias {
		switch m.Rol {
		case domain.RolGuia, domain.RolCoordinador:
			modo = "guia"
		case domain.RolAprendiz:
			if modo == "nuevo" {
				modo = "aprendiz"
			}
		}
	}
	return &Yo2{Persona: p, Modo: modo, Espacios: c.Espacios, Membresias: c.Membresias}, nil
}

// Unirme: una persona ya logueada entra a un grupo con su código, como aprendiz.
func (s *Servicios) Unirme(ctx context.Context, p domain.Persona, codigo string) (*domain.Grupo, error) {
	g, err := s.Membresias.GrupoPorCodigo(ctx, codigo)
	if err != nil {
		return nil, err
	}
	if err := s.Membresias.Unir(ctx, p.ID, g.EspacioID, g.ID, domain.RolAprendiz); err != nil {
		return nil, err
	}
	_ = s.Eventos.Emitir(ctx, domain.Evento{PersonaID: &p.ID, GrupoID: &g.ID, Verbo: "grupo.unido", Origen: "observado", Ocurrio: time.Now()})
	return g, nil
}

// ---- actividades (guía) ----

func (s *Servicios) Biblioteca(ctx context.Context, p domain.Persona) (recetas, mias []domain.Actividad, err error) {
	recetas, err = s.Actividades.Recetas(ctx)
	if err != nil {
		return
	}
	esp, err := s.Espacios.DePersona(ctx, p.ID)
	if err != nil {
		return
	}
	ids := make([]string, 0, len(esp))
	for _, e := range esp {
		ids = append(ids, e.ID)
	}
	mias, err = s.Actividades.DeEspacios(ctx, ids)
	return
}

type NuevaActividad struct {
	EspacioID   string          `json:"espacioId"`
	Titulo      string          `json:"titulo"`
	DesdeReceta string          `json:"desdeReceta"` // id de receta a duplicar, opcional
	Composicion json.RawMessage `json:"composicion"`
}

func (s *Servicios) CrearActividad(ctx context.Context, p domain.Persona, in NuevaActividad) (*domain.Actividad, error) {
	if !s.esMiembro(ctx, p.ID, in.EspacioID, domain.RolGuia, domain.RolCoordinador) {
		return nil, domain.ErrNoAutorizado
	}
	a := domain.Actividad{EspacioID: &in.EspacioID, Titulo: in.Titulo, Autores: []string{p.ID}}
	if in.DesdeReceta != "" {
		r, err := s.Actividades.PorID(ctx, in.DesdeReceta)
		if err != nil {
			return nil, err
		}
		a.Composicion, a.Documento, a.Rubrica = r.Composicion, r.Documento, r.Rubrica
		if a.Titulo == "" {
			a.Titulo = r.Titulo
		}
	} else {
		a.Composicion = in.Composicion
		a.Documento = s.documentoDesdeLente(ctx, in.Composicion)
		a.Rubrica = json.RawMessage(`[]`)
	}
	if a.Titulo == "" {
		a.Titulo = "Sin título"
	}
	out, err := s.Actividades.Crear(ctx, a)
	if err != nil {
		return nil, err
	}
	_ = s.Eventos.Emitir(ctx, domain.Evento{PersonaID: &p.ID, ActividadID: &out.ID, Verbo: "actividad.creada", Payload: map[string]any{"desdeReceta": in.DesdeReceta}, Origen: "observado", Ocurrio: time.Now()})
	return out, nil
}

// documentoDesdeLente arma un documento vacío con las fases que trae el lente elegido.
func (s *Servicios) documentoDesdeLente(ctx context.Context, comp json.RawMessage) json.RawMessage {
	var c struct {
		Lente string `json:"lente"`
	}
	json.Unmarshal(comp, &c)
	lentes, _ := s.Lentes.Todos(ctx)
	type fase struct {
		Clave, Nombre, Pide string
		Bloques             []any `json:"bloques"`
	}
	fases := []map[string]any{}
	for _, l := range lentes {
		if l.Clave == c.Lente {
			for _, f := range l.Fases {
				fases = append(fases, map[string]any{"clave": f.Clave, "nombre": f.Nombre, "pide": f.Pide, "bloques": []any{}})
			}
		}
	}
	if len(fases) == 0 {
		fases = append(fases, map[string]any{"clave": "unica", "nombre": "Actividad", "pide": "", "bloques": []any{}})
	}
	b, _ := json.Marshal(map[string]any{"fases": fases})
	return b
}

func (s *Servicios) VerActividad(ctx context.Context, p domain.Persona, id string) (*domain.Actividad, error) {
	a, err := s.Actividades.PorID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !a.EsReceta && !s.esMiembro(ctx, p.ID, *a.EspacioID, domain.RolGuia, domain.RolCoordinador) {
		return nil, domain.ErrNoAutorizado
	}
	return a, nil
}

func (s *Servicios) GuardarActividad(ctx context.Context, p domain.Persona, a domain.Actividad) error {
	actual, err := s.VerActividad(ctx, p, a.ID)
	if err != nil {
		return err
	}
	if actual.EsReceta {
		return domain.ErrNoAutorizado
	}
	actual.Titulo, actual.Composicion, actual.Documento, actual.Rubrica = a.Titulo, a.Composicion, a.Documento, a.Rubrica
	if err := s.Actividades.Guardar(ctx, *actual); err != nil {
		return err
	}
	return s.Eventos.Emitir(ctx, domain.Evento{PersonaID: &p.ID, ActividadID: &a.ID, Verbo: "actividad.editada", Origen: "observado", Ocurrio: time.Now()})
}

// ---- asignar ----

func (s *Servicios) Asignar(ctx context.Context, p domain.Persona, actividadID, grupoID string) (*domain.Asignacion, error) {
	a, err := s.VerActividad(ctx, p, actividadID)
	if err != nil {
		return nil, err
	}
	g, err := s.Grupos.PorID(ctx, grupoID)
	if err != nil {
		return nil, err
	}
	if !s.esMiembro(ctx, p.ID, g.EspacioID, domain.RolGuia, domain.RolCoordinador) {
		return nil, domain.ErrNoAutorizado
	}
	as, err := s.Asignaciones.Crear(ctx, domain.Asignacion{ActividadID: a.ID, GrupoID: g.ID, Documento: a.Documento, Rubrica: a.Rubrica})
	if err != nil {
		return nil, err
	}
	_ = s.Eventos.Emitir(ctx, domain.Evento{PersonaID: &p.ID, GrupoID: &g.ID, ActividadID: &a.ID, Verbo: "actividad.asignada", Payload: map[string]any{"asignacionId": as.ID}, Origen: "observado", Ocurrio: time.Now()})
	return as, nil
}

// ---- hacer (aprendiz) ----

type Sala struct {
	Grupo    domain.Grupo        `json:"grupo"`
	Misiones []domain.Asignacion `json:"misiones"`
}

func (s *Servicios) Hoy(ctx context.Context, p domain.Persona) ([]Sala, error) {
	grupos, err := s.Membresias.GruposDeAprendiz(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	asig, err := s.Asignaciones.DeAprendiz(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	salas := make([]Sala, 0, len(grupos))
	for _, g := range grupos {
		sala := Sala{Grupo: g, Misiones: []domain.Asignacion{}}
		for _, a := range asig {
			if a.GrupoID == g.ID {
				sala.Misiones = append(sala.Misiones, a)
			}
		}
		salas = append(salas, sala)
	}
	return salas, nil
}

type Mision struct {
	Asignacion domain.Asignacion `json:"asignacion"`
	Entrega    domain.Entrega    `json:"entrega"`
}

func (s *Servicios) AbrirMision(ctx context.Context, p domain.Persona, asignacionID string) (*Mision, error) {
	a, err := s.Asignaciones.PorID(ctx, asignacionID)
	if err != nil {
		return nil, err
	}
	e, err := s.Entregas.Abrir(ctx, a.ID, p.ID)
	if err != nil {
		return nil, err
	}
	if e.Estado == "en_curso" && len(e.Respuestas) <= 2 {
		_ = s.Eventos.Emitir(ctx, domain.Evento{PersonaID: &p.ID, GrupoID: &a.GrupoID, ActividadID: &a.ActividadID, Verbo: "mision.abierta", Origen: "observado", Ocurrio: time.Now()})
	}
	return &Mision{Asignacion: *a, Entrega: *e}, nil
}

func (s *Servicios) GuardarRespuestas(ctx context.Context, p domain.Persona, entregaID string, respuestas json.RawMessage, entregar bool) (*domain.Entrega, error) {
	e, err := s.Entregas.PorID(ctx, entregaID)
	if err != nil {
		return nil, err
	}
	if e.AprendizID != p.ID {
		return nil, domain.ErrNoAutorizado
	}
	e.Respuestas = respuestas
	verbo := "respuesta.guardada"
	if entregar && e.Estado == "en_curso" {
		now := time.Now()
		e.Estado, e.EntregadaAt, verbo = "entregada", &now, "mision.entregada"
	}
	if err := s.Entregas.Guardar(ctx, *e); err != nil {
		return nil, err
	}
	a, _ := s.Asignaciones.PorID(ctx, e.AsignacionID)
	var gid, aid *string
	if a != nil {
		gid, aid = &a.GrupoID, &a.ActividadID
	}
	_ = s.Eventos.Emitir(ctx, domain.Evento{PersonaID: &p.ID, GrupoID: gid, ActividadID: aid, Verbo: verbo, Payload: map[string]any{"entregaId": e.ID}, Origen: "observado", Ocurrio: time.Now()})
	return e, nil
}

// ---- corregir (guía) ----

func (s *Servicios) EntregasDe(ctx context.Context, p domain.Persona, asignacionID string) (*domain.Asignacion, []domain.Entrega, error) {
	a, err := s.Asignaciones.PorID(ctx, asignacionID)
	if err != nil {
		return nil, nil, err
	}
	g, err := s.Grupos.PorID(ctx, a.GrupoID)
	if err != nil {
		return nil, nil, err
	}
	if !s.esMiembro(ctx, p.ID, g.EspacioID, domain.RolGuia, domain.RolCoordinador) {
		return nil, nil, domain.ErrNoAutorizado
	}
	es, err := s.Entregas.DeAsignacion(ctx, a.ID)
	return a, es, err
}

func (s *Servicios) Puntuar(ctx context.Context, p domain.Persona, entregaID string, puntajes json.RawMessage) error {
	e, err := s.Entregas.PorID(ctx, entregaID)
	if err != nil {
		return err
	}
	a, _, err := s.EntregasDe(ctx, p, e.AsignacionID)
	if err != nil {
		return err
	}
	e.Puntajes, e.Estado = puntajes, "corregida"
	if err := s.Entregas.Guardar(ctx, *e); err != nil {
		return err
	}
	return s.Eventos.Emitir(ctx, domain.Evento{PersonaID: &e.AprendizID, GrupoID: &a.GrupoID, ActividadID: &a.ActividadID, Verbo: "rubrica.puntuada", Payload: map[string]any{"entregaId": e.ID, "por": p.ID}, Origen: "observado", Ocurrio: time.Now()})
}

func (s *Servicios) GrupoConDetalle(ctx context.Context, p domain.Persona, id string) (*domain.Grupo, []domain.Asignacion, []domain.Aprendiz, error) {
	g, err := s.Grupos.PorID(ctx, id)
	if err != nil {
		return nil, nil, nil, err
	}
	if !s.esMiembro(ctx, p.ID, g.EspacioID, domain.RolGuia, domain.RolCoordinador) {
		return nil, nil, nil, domain.ErrNoAutorizado
	}
	as, err := s.Asignaciones.DeGrupo(ctx, g.ID)
	if err != nil {
		return nil, nil, nil, err
	}
	ap, err := s.Membresias.Aprendices(ctx, g.ID)
	return g, as, ap, err
}
