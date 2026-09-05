package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"melu/internal/domain"
)

type Profiles struct{ r *Repos }

func (r *Repos) Profiles() *Profiles { return &Profiles{r: r} }

const profileCols = `f.person_id, f.declared, f.answers, f.created_at, f.updated_at`

func scanProfile(row pgx.CollectableRow) (domain.Profile, error) {
	var p domain.Profile
	err := row.Scan(&p.PersonID, &p.Declared, &p.Answers, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func (x *Profiles) ByPerson(ctx context.Context, personID string) (*domain.Profile, error) {
	rows, err := x.r.db.Query(ctx, `select `+profileCols+` from profiles f where f.person_id=$1`, personID)
	if err != nil {
		return nil, err
	}
	p, err := pgx.CollectOneRow(rows, scanProfile)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (x *Profiles) Save(ctx context.Context, p domain.Profile) error {
	_, err := x.r.db.Exec(ctx, `insert into profiles (person_id, declared, answers) values ($1,$2,$3)
	  on conflict (person_id) do update set declared=excluded.declared, answers=excluded.answers, updated_at=now()`,
		p.PersonID, p.Declared, p.Answers)
	return err
}

func (x *Profiles) OfGroup(ctx context.Context, groupID string) (map[string]domain.Profile, error) {
	rows, err := x.r.db.Query(ctx, `select `+profileCols+` from profiles f
	  join memberships m on m.person_id=f.person_id and m.group_id=$1 and m.role='learner'`, groupID)
	if err != nil {
		return nil, err
	}
	ps, err := pgx.CollectRows(rows, scanProfile)
	if err != nil {
		return nil, err
	}
	out := make(map[string]domain.Profile, len(ps))
	for _, p := range ps {
		out[p.PersonID] = p
	}
	return out, nil
}
