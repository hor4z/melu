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
	DeGuia(ctx context.Context, personaID, espacioID string) ([]domain.Grupo, error)
	PorID(ctx context.Context, id string) (*domain.Grupo, error)
}

type Lentes interface {
	Todos(ctx context.Context) ([]domain.Lente, error)
}

type Eventos interface {
	Emitir(ctx context.Context, e domain.Evento) error
}

type Actividades interface {
	Recetas(ctx context.Context) ([]domain.Actividad, error)
	DeEspacios(ctx context.Context, espacioIDs []string) ([]domain.Actividad, error)
	PorID(ctx context.Context, id string) (*domain.Actividad, error)
	Crear(ctx context.Context, a domain.Actividad) (*domain.Actividad, error)
	Guardar(ctx context.Context, a domain.Actividad) error
}

type Asignaciones interface {
	Crear(ctx context.Context, a domain.Asignacion) (*domain.Asignacion, error)
	DeGrupo(ctx context.Context, grupoID string) ([]domain.Asignacion, error)
	DeAprendiz(ctx context.Context, aprendizID string) ([]domain.Asignacion, error)
	PorID(ctx context.Context, id string) (*domain.Asignacion, error)
}

type Entregas interface {
	Abrir(ctx context.Context, asignacionID, aprendizID string) (*domain.Entrega, error)
	Guardar(ctx context.Context, e domain.Entrega) error
	DeAsignacion(ctx context.Context, asignacionID string) ([]domain.Entrega, error)
	PorID(ctx context.Context, id string) (*domain.Entrega, error)
}

type Membresias interface {
	Unir(ctx context.Context, personaID, espacioID, grupoID string, rol domain.Rol) error
	GrupoPorCodigo(ctx context.Context, codigo string) (*domain.Grupo, error)
	GruposDeAprendiz(ctx context.Context, personaID string) ([]domain.Grupo, error)
	Aprendices(ctx context.Context, grupoID string) ([]domain.Aprendiz, error)
}

type Panel interface {
	HechosDeGuia(ctx context.Context, guiaID, espacioID string) ([]domain.Hecho, error)
	HechosDeAprendiz(ctx context.Context, aprendizID string) ([]domain.Hecho, error)
	HayAsignaciones(ctx context.Context, guiaID string) bool
}

type Perfiles interface {
	PorPersona(ctx context.Context, personaID string) (*domain.Perfil, error)
	Guardar(ctx context.Context, p domain.Perfil) error
	DeGrupo(ctx context.Context, grupoID string) (map[string]domain.Perfil, error)
}
