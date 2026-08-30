package postgres

import (
	"context"

	"melu/internal/domain"
)

type Sesiones struct{ r *Repos }

func (r *Repos) Sesiones() *Sesiones { return &Sesiones{r: r} }

func (s *Sesiones) Crear(ctx context.Context, personaID string) (string, error) {
	return s.r.CrearSesion(ctx, personaID)
}
func (s *Sesiones) Resolver(ctx context.Context, token string) (*domain.Persona, error) {
	return s.r.Resolver(ctx, token)
}
func (s *Sesiones) Borrar(ctx context.Context, token string) error { return s.r.Borrar(ctx, token) }

type Espacios struct{ r *Repos }

func (r *Repos) Espacios() *Espacios { return &Espacios{r: r} }
func (e *Espacios) Crear(ctx context.Context, x domain.Espacio, creadorID string) (*domain.Espacio, error) {
	return e.r.CrearEspacio(ctx, x, creadorID)
}
func (e *Espacios) DePersona(ctx context.Context, id string) ([]domain.Espacio, error) {
	return e.r.DePersona(ctx, id)
}
func (e *Espacios) Membresias(ctx context.Context, id string) ([]domain.Membresia, error) {
	return e.r.membresiasDe(ctx, id)
}

type Grupos struct{ r *Repos }

func (r *Repos) Grupos() *Grupos { return &Grupos{r: r} }
func (g *Grupos) Crear(ctx context.Context, x domain.Grupo, guiaID string) (*domain.Grupo, error) {
	return g.r.CrearGrupo(ctx, x, guiaID)
}
func (g *Grupos) DeGuia(ctx context.Context, id, espacioID string) ([]domain.Grupo, error) {
	return g.r.DeGuia(ctx, id, espacioID)
}
func (g *Grupos) PorID(ctx context.Context, id string) (*domain.Grupo, error) {
	return g.r.PorID(ctx, id)
}
