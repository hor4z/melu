package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"melu/internal/domain"
)

type Perfiles struct{ r *Repos }

func (r *Repos) Perfiles() *Perfiles { return &Perfiles{r: r} }

const perfilCols = `f.persona_id, f.declarado, f.respuestas, f.creado, f.actualizado`

func scanPerfil(row pgx.CollectableRow) (domain.Perfil, error) {
	var p domain.Perfil
	err := row.Scan(&p.PersonaID, &p.Declarado, &p.Respuestas, &p.Creado, &p.Actualizado)
	return p, err
}

func (x *Perfiles) PorPersona(ctx context.Context, personaID string) (*domain.Perfil, error) {
	rows, err := x.r.db.Query(ctx, `select `+perfilCols+` from perfil f where f.persona_id=$1`, personaID)
	if err != nil {
		return nil, err
	}
	p, err := pgx.CollectOneRow(rows, scanPerfil)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNoEncontrado
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (x *Perfiles) Guardar(ctx context.Context, p domain.Perfil) error {
	_, err := x.r.db.Exec(ctx, `insert into perfil (persona_id, declarado, respuestas) values ($1,$2,$3)
	  on conflict (persona_id) do update set declarado=excluded.declarado, respuestas=excluded.respuestas, actualizado=now()`,
		p.PersonaID, p.Declarado, p.Respuestas)
	return err
}

func (x *Perfiles) DeGrupo(ctx context.Context, grupoID string) (map[string]domain.Perfil, error) {
	rows, err := x.r.db.Query(ctx, `select `+perfilCols+` from perfil f
	  join membresia m on m.persona_id=f.persona_id and m.grupo_id=$1 and m.rol='aprendiz'`, grupoID)
	if err != nil {
		return nil, err
	}
	ps, err := pgx.CollectRows(rows, scanPerfil)
	if err != nil {
		return nil, err
	}
	out := make(map[string]domain.Perfil, len(ps))
	for _, p := range ps {
		out[p.PersonaID] = p
	}
	return out, nil
}
