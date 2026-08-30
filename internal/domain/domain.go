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
