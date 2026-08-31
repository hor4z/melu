// Package domain define las entidades y reglas del sistema. No importa nada fuera de la stdlib.
package domain

import (
	"encoding/json"
	"errors"
	"time"
)

var (
	ErrNoEncontrado = errors.New("no encontrado")
	ErrNoAutorizado = errors.New("no autorizado")
	ErrInvalido     = errors.New("inválido")
)

type Rol string

const (
	RolGuia        Rol = "guia"
	RolAprendiz    Rol = "aprendiz"
	RolAcompanante Rol = "acompanante"
	RolCoordinador Rol = "coordinador"
)

type Persona struct {
	ID        string
	Email     string
	GoogleSub string
	Nombre    string
}

type Espacio struct {
	ID     string `json:"id"`
	Nombre string `json:"nombre"`
	Slug   string `json:"slug"`
	Tipo   string `json:"tipo"`
}

type Grupo struct {
	ID         string          `json:"id"`
	EspacioID  string          `json:"espacioId"`
	Nombre     string          `json:"nombre"`
	Codigo     string          `json:"codigo"`
	Etiquetas  json.RawMessage `json:"etiquetas"`
	Aprendices int             `json:"aprendices"`
}

type Membresia struct {
	EspacioID string  `json:"espacioId"`
	GrupoID   *string `json:"grupoId"`
	Rol       Rol     `json:"rol"`
}

type Fase struct {
	Clave  string `json:"clave"`
	Nombre string `json:"nombre"`
	Pide   string `json:"pide"`
}

type Lente struct {
	Clave       string `json:"clave"`
	Nombre      string `json:"nombre"`
	Descripcion string `json:"descripcion"`
	Fases       []Fase `json:"fases"`
}

// Evento es el hecho inmutable del que todo lo demás se deriva.
type Evento struct {
	PersonaID   *string
	GrupoID     *string
	ActividadID *string
	Verbo       string
	Payload     any
	Origen      string // observado | declarado | inferido
	Ocurrio     time.Time
}

func ValidarNombre(s string) error {
	if len(s) < 2 || len(s) > 120 {
		return ErrInvalido
	}
	return nil
}

// ---- contenido y circuito ----

type Actividad struct {
	ID          string          `json:"id"`
	EspacioID   *string         `json:"espacioId"`
	Titulo      string          `json:"titulo"`
	EsReceta    bool            `json:"esReceta"`
	Composicion json.RawMessage `json:"composicion"`
	Documento   json.RawMessage `json:"documento"`
	Rubrica     json.RawMessage `json:"rubrica"`
	Autores     []string        `json:"autores"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

type Asignacion struct {
	ID              string          `json:"id"`
	ActividadID     string          `json:"actividadId"`
	GrupoID         string          `json:"grupoId"`
	Titulo          string          `json:"titulo"`
	Composicion     json.RawMessage `json:"composicion"`
	Documento       json.RawMessage `json:"documento,omitempty"`
	Rubrica         json.RawMessage `json:"rubrica,omitempty"`
	Abre            time.Time       `json:"abre"`
	Cierra          *time.Time      `json:"cierra"`
	Entregas        int             `json:"entregas"`
	EntregasTotales int             `json:"entregasTotales"`
	// solo para el aprendiz
	GrupoNombre string  `json:"grupoNombre,omitempty"`
	MiEstado    *string `json:"miEstado"`
}

type Entrega struct {
	ID           string          `json:"id"`
	AsignacionID string          `json:"asignacionId"`
	AprendizID   string          `json:"aprendizId"`
	Aprendiz     string          `json:"aprendiz,omitempty"`
	Estado       string          `json:"estado"`
	Respuestas   json.RawMessage `json:"respuestas"`
	Artefactos   json.RawMessage `json:"artefactos"`
	Pasos        json.RawMessage `json:"pasos"`
	Puntajes     json.RawMessage `json:"puntajes"`
	EntregadaAt  *time.Time      `json:"entregadaAt"`
	UpdatedAt    time.Time       `json:"updatedAt"`
}

type Aprendiz struct {
	ID     string `json:"id"`
	Nombre string `json:"nombre"`
}

// Hecho es una entrega con su contexto y tiempos: la fila cruda de la que se derivan las métricas.
type Hecho struct {
	EntregaID, AsignacionID, AprendizID, Aprendiz, GrupoID, Grupo, Titulo, Estado string
	Experiencia                                                                   string
	Abierta, Entregada                                                            *time.Time
	Respuestas, Documento, Pasos, Composicion                                     json.RawMessage
	Actualizada                                                                   time.Time
}

// ---- perfil de aprendizaje ----

// Perfil es una foto de cómo le entra el contenido a alguien, no una etiqueta.
// Declarado sale del onboarding; lo observado se recalcula siempre de las entregas.
type Perfil struct {
	PersonaID   string             `json:"personaId"`
	Declarado   map[string]float64 `json:"declarado"`
	Respuestas  json.RawMessage    `json:"respuestas"`
	Creado      time.Time          `json:"creado"`
	Actualizado time.Time          `json:"actualizado"`
}
