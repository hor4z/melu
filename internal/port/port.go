package port

import (
	"context"
	"time"

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
	// DeAprendiz trae todo lo que abre hasta `hasta`, sin filtrar por vencimiento: quién decide
	// qué está atrasado, abierto o por venir es el caso de uso, no el SQL. Antes el filtro vivía
	// acá y hacía desaparecer en silencio lo vencido sin entregar.
	DeAprendiz(ctx context.Context, aprendizID string, hasta time.Time) ([]domain.Asignacion, error)
	PorID(ctx context.Context, id string) (*domain.Asignacion, error)
	Reprogramar(ctx context.Context, id string, abre time.Time, cierra *time.Time) error
}

type Series interface {
	Crear(ctx context.Context, r domain.Repeticion) (string, error)
	PorID(ctx context.Context, id string) (*domain.Repeticion, error)
	Acortar(ctx context.Context, id string, hasta time.Time) error
}

type Programacion interface {
	// DeGuia trae las asignaciones de los grupos donde la persona es guía, en un rango, con
	// entregas, total de aprendices y cuántas quedaron sin corregir.
	DeGuia(ctx context.Context, guiaID, espacioID string, desde, hasta time.Time) ([]domain.Programado, error)
	SerieDeAsignacion(ctx context.Context, asignacionID string) (grupoID string, err error)
	// BorrarFuturasDeSerie borra las ocurrencias desde una fecha que no tengan ninguna entrega.
	// Las que ya tienen trabajo hecho no se tocan nunca: se informa cuántas quedaron.
	BorrarFuturasDeSerie(ctx context.Context, serieID string, desde time.Time) (borradas, conservadas int, err error)
	EspaciosDeSerie(ctx context.Context, serieID string) ([]string, error)
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
