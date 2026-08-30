package port

import (
	"context"

	"melu/internal/domain"
)

type Personas interface {
	PorGoogleSub(ctx context.Context, sub string) (*domain.Persona, error)
	PorEmail(ctx context.Context, email string) (*domain.Persona, error)
	Crear(ctx context.Context, p domain.Persona) (*domain.Persona, error)
	VincularGoogle(ctx context.Context, id, sub string) error
}

type Sesiones interface {
	Crear(ctx context.Context, personaID string) (token string, err error)
	Resolver(ctx context.Context, token string) (*domain.Persona, error)
	Borrar(ctx context.Context, token string) error
}

type Espacios interface {
	Crear(ctx context.Context, e domain.Espacio, creadorID string) (*domain.Espacio, error)
	DePersona(ctx context.Context, personaID string) ([]domain.Espacio, error)
	Membresias(ctx context.Context, personaID string) ([]domain.Membresia, error)
}

type Grupos interface {
	Crear(ctx context.Context, g domain.Grupo, guiaID string) (*domain.Grupo, error)
	DeGuia(ctx context.Context, personaID string) ([]domain.Grupo, error)
	PorID(ctx context.Context, id string) (*domain.Grupo, error)
}

type Lentes interface {
	Todos(ctx context.Context) ([]domain.Lente, error)
}

type Eventos interface {
	Emitir(ctx context.Context, e domain.Evento) error
}
