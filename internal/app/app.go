// Package app orquesta el dominio a través de los puertos. No sabe de HTTP ni de SQL.
package app

import (
	"context"
	"crypto/rand"
	"strings"
	"time"

	"melu/internal/domain"
	"melu/internal/port"
)

type Servicios struct {
	Personas     port.Personas
	Sesiones     port.Sesiones
	Espacios     port.Espacios
	Grupos       port.Grupos
	Lentes       port.Lentes
	Eventos      port.Eventos
	Actividades  port.Actividades
	Asignaciones port.Asignaciones
	Entregas     port.Entregas
	Membresias   port.Membresias
	Panel        port.Panel
	Perfiles     port.Perfiles
	// Zona: si es nil se usa la del proceso.
	Zona *time.Location
}

func (s *Servicios) zona() *time.Location {
	if s.Zona != nil {
		return s.Zona
	}
	return time.Local
}

// inicioDelDia da el arranque del día local. Existe porque `Truncate(24*time.Hour)` trunca en
// UTC: en Argentina el «día» empezaba a las 21:00 y las barras del panel salían corridas.
func inicioDelDia(t time.Time, z *time.Location) time.Time {
	t = t.In(z)
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, z)
}

// EntrarConIdentidad resuelve o crea la persona a partir de una identidad externa y abre sesión.
func (s *Servicios) EntrarConIdentidad(ctx context.Context, sub, email, nombre string) (token string, err error) {
	p, err := s.Personas.PorGoogleSub(ctx, sub)
	if err != nil && err != domain.ErrNoEncontrado {
		return "", err
	}
	if p == nil && email != "" {
		p, err = s.Personas.PorEmail(ctx, email)
		if err != nil && err != domain.ErrNoEncontrado {
			return "", err
		}
		if p != nil {
			if err := s.Personas.VincularGoogle(ctx, p.ID, sub); err != nil {
				return "", err
			}
		}
	}
	if p == nil {
		if nombre == "" {
			nombre = strings.Split(email, "@")[0]
		}
		p, err = s.Personas.Crear(ctx, domain.Persona{Email: email, GoogleSub: sub, Nombre: nombre})
		if err != nil {
			return "", err
		}
		_ = s.Eventos.Emitir(ctx, domain.Evento{PersonaID: &p.ID, Verbo: "persona.creada", Origen: "observado", Ocurrio: time.Now()})
	}
	_ = s.Eventos.Emitir(ctx, domain.Evento{PersonaID: &p.ID, Verbo: "sesion.iniciada", Origen: "observado", Ocurrio: time.Now()})
	return s.Sesiones.Crear(ctx, p.ID)
}

type Contexto struct {
	Persona    domain.Persona     `json:"persona"`
	Espacios   []domain.Espacio   `json:"espacios"`
	Membresias []domain.Membresia `json:"membresias"`
}

func (s *Servicios) Yo(ctx context.Context, p domain.Persona) (*Contexto, error) {
	esp, err := s.Espacios.DePersona(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	mem, err := s.Espacios.Membresias(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	return &Contexto{Persona: p, Espacios: esp, Membresias: mem}, nil
}

func (s *Servicios) CrearEspacio(ctx context.Context, p domain.Persona, nombre, tipo string) (*domain.Espacio, error) {
	if err := domain.ValidarNombre(nombre); err != nil {
		return nil, err
	}
	if tipo == "" {
		tipo = "personal"
	}
	e, err := s.Espacios.Crear(ctx, domain.Espacio{Nombre: nombre, Slug: slug(nombre) + "-" + codigo(4), Tipo: tipo}, p.ID)
	if err != nil {
		return nil, err
	}
	_ = s.Eventos.Emitir(ctx, domain.Evento{PersonaID: &p.ID, Verbo: "espacio.creado", Payload: map[string]any{"espacioId": e.ID}, Origen: "observado", Ocurrio: time.Now()})
	return e, nil
}

func (s *Servicios) CrearGrupo(ctx context.Context, p domain.Persona, espacioID, nombre string) (*domain.Grupo, error) {
	if err := domain.ValidarNombre(nombre); err != nil {
		return nil, err
	}
	if !s.esMiembro(ctx, p.ID, espacioID, domain.RolCoordinador, domain.RolGuia) {
		return nil, domain.ErrNoAutorizado
	}
	g, err := s.Grupos.Crear(ctx, domain.Grupo{EspacioID: espacioID, Nombre: nombre, Codigo: codigo(6)}, p.ID)
	if err != nil {
		return nil, err
	}
	_ = s.Eventos.Emitir(ctx, domain.Evento{PersonaID: &p.ID, GrupoID: &g.ID, Verbo: "grupo.creado", Origen: "observado", Ocurrio: time.Now()})
	return g, nil
}

func (s *Servicios) esMiembro(ctx context.Context, personaID, espacioID string, roles ...domain.Rol) bool {
	mem, err := s.Espacios.Membresias(ctx, personaID)
	if err != nil {
		return false
	}
	for _, m := range mem {
		if m.EspacioID != espacioID {
			continue
		}
		for _, r := range roles {
			if m.Rol == r {
				return true
			}
		}
	}
	return false
}

// codigo genera un código legible sin caracteres ambiguos (0/O, 1/I/L).
func codigo(n int) string {
	const alf = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
	b := make([]byte, n)
	rand.Read(b)
	for i := range b {
		b[i] = alf[int(b[i])%len(alf)]
	}
	return string(b)
}

func slug(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == ' ' || r == '-' || r == '_':
			b.WriteByte('-')
		}
	}
	return strings.Trim(b.String(), "-")
}
