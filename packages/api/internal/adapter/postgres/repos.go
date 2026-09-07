package postgres

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"melu/internal/domain"
)

type Repos struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Repos { return &Repos{db: db} }

func noRows(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	return err
}

// ---- People ----
type personRow struct {
	ID, Name                              string
	Email, Sub, Avatar, First, Last, Nick *string
}

func (r personRow) dom() *domain.Person {
	p := &domain.Person{ID: r.ID, Name: r.Name}
	if r.Email != nil {
		p.Email = *r.Email
	}
	if r.Sub != nil {
		p.GoogleSub = *r.Sub
	}
	if r.Avatar != nil {
		p.AvatarURL = *r.Avatar
	}
	if r.First != nil {
		p.FirstName = *r.First
	}
	if r.Last != nil {
		p.LastName = *r.Last
	}
	if r.Nick != nil {
		p.Nickname = *r.Nick
	}
	return p
}

const personCols = `id, name, email, google_sub, avatar_url, first_name, last_name, nickname`

func (r *Repos) person(ctx context.Context, where string, arg any) (*domain.Person, error) {
	var row personRow
	err := r.db.QueryRow(ctx, `select `+personCols+` from people where `+where, arg).
		Scan(&row.ID, &row.Name, &row.Email, &row.Sub, &row.Avatar, &row.First, &row.Last, &row.Nick)
	if err != nil {
		return nil, noRows(err)
	}
	return row.dom(), nil
}

func (r *Repos) ByGoogleSub(ctx context.Context, sub string) (*domain.Person, error) {
	return r.person(ctx, "google_sub=$1", sub)
}

// ByEmail matches on the lowercase form, which is the one the unique index is built on.
func (r *Repos) ByEmail(ctx context.Context, email string) (*domain.Person, error) {
	return r.person(ctx, "lower(email)=lower($1)", email)
}
func (r *Repos) Create(ctx context.Context, p domain.Person) (*domain.Person, error) {
	if p.FirstName == "" && p.LastName == "" {
		p.FirstName, p.LastName = domain.SplitName(p.Name)
	}
	var id string
	err := r.db.QueryRow(ctx, `insert into people(email, google_sub, name, avatar_url, first_name, last_name)
	        values(nullif(lower($1),''), nullif($2,''), $3, nullif($4,''), nullif($5,''), nullif($6,'')) returning id`,
		p.Email, p.GoogleSub, p.Name, p.AvatarURL, p.FirstName, p.LastName).Scan(&id)
	if err != nil {
		return nil, err
	}
	p.ID = id
	return &p, nil
}

// LinkGoogle adopts a person who was already here (added by a guide, or seeded) the first time
// they sign in. The picture only fills a gap: what Google knows beats a placeholder and loses
// to anything a person chose.
func (r *Repos) LinkGoogle(ctx context.Context, id, sub, name, avatar string) error {
	first, last := domain.SplitName(name)
	_, err := r.db.Exec(ctx,
		`update people set google_sub=$2, name=coalesce(nullif($3,''), name), avatar_url=coalesce(avatar_url, nullif($4,'')),
		        first_name=coalesce(first_name, nullif($5,'')), last_name=coalesce(last_name, nullif($6,'')) where id=$1`,
		id, sub, name, avatar, first, last)
	return err
}

func (r *Repos) SaveProfile(ctx context.Context, id, name, first, last, nickname string) error {
	_, err := r.db.Exec(ctx,
		`update people set name=$2, first_name=nullif($3,''), last_name=nullif($4,''), nickname=nullif($5,'') where id=$1`,
		id, name, first, last, nickname)
	return err
}

// ---- Sessions ----
func (r *Repos) CreateSession(ctx context.Context, personID string) (string, error) {
	b := make([]byte, 32)
	rand.Read(b)
	tok := hex.EncodeToString(b)
	_, err := r.db.Exec(ctx, `insert into sessions(token, person_id, expires_at) values($1,$2,$3)`, tok, personID, time.Now().Add(30*24*time.Hour))
	return tok, err
}
func (r *Repos) Resolve(ctx context.Context, token string) (*domain.Person, error) {
	var row personRow
	err := r.db.QueryRow(ctx, `select p.id, p.name, p.email, p.google_sub, p.avatar_url, p.first_name, p.last_name, p.nickname from sessions s join people p on p.id=s.person_id where s.token=$1 and s.expires_at>now()`, token).
		Scan(&row.ID, &row.Name, &row.Email, &row.Sub, &row.Avatar, &row.First, &row.Last, &row.Nick)
	if err != nil {
		return nil, noRows(err)
	}
	return row.dom(), nil
}
func (r *Repos) Delete(ctx context.Context, token string) error {
	_, err := r.db.Exec(ctx, `delete from sessions where token=$1`, token)
	return err
}

// ---- Spaces ----
func (r *Repos) CreateSpace(ctx context.Context, e domain.Space, creatorID string) (*domain.Space, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := tx.QueryRow(ctx, `insert into spaces(name, slug, kind) values($1,$2,$3) returning id`, e.Name, e.Slug, e.Kind).Scan(&e.ID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `insert into memberships(person_id, space_id, role) values($1,$2,'coordinator'),($1,$2,'guide')`, creatorID, e.ID); err != nil {
		return nil, err
	}
	return &e, tx.Commit(ctx)
}

func (r *Repos) OfPerson(ctx context.Context, personID string) ([]domain.Space, error) {
	rows, err := r.db.Query(ctx, `select distinct e.id, e.name, e.slug, e.kind from spaces e join memberships m on m.space_id=e.id where m.person_id=$1 order by e.name`, personID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Space, error) {
		var e domain.Space
		return e, row.Scan(&e.ID, &e.Name, &e.Slug, &e.Kind)
	})
}

func (r *Repos) membershipsOf(ctx context.Context, personID string) ([]domain.Membership, error) {
	rows, err := r.db.Query(ctx, `select space_id, group_id, role from memberships where person_id=$1`, personID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Membership, error) {
		var m domain.Membership
		return m, row.Scan(&m.SpaceID, &m.GroupID, &m.Role)
	})
}

// ---- Groups ----
func (r *Repos) CreateGroup(ctx context.Context, g domain.Group, guideID string) (*domain.Group, error) {
	if g.Tags == nil {
		g.Tags = json.RawMessage(`{}`)
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := tx.QueryRow(ctx, `insert into groups(space_id, name, description, tags) values($1,$2,nullif($3,''),$4) returning id`,
		g.SpaceID, g.Name, g.Description, g.Tags).Scan(&g.ID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `insert into memberships(person_id, space_id, group_id, role) values($1,$2,$3,'guide')`, guideID, g.SpaceID, g.ID); err != nil {
		return nil, err
	}
	// Recién creado no hay nadie adentro, pero la lista viaja vacía y no nula: el front dibuja
	// caras con esto y `null` lo haría explotar.
	g.Names = []string{}
	return &g, tx.Commit(ctx)
}

const groupCols = `g.id, g.space_id, g.name, coalesce(g.description, ''), g.tags,
  (select count(*) from memberships a where a.group_id=g.id and a.role='learner')`

// Con los nombres de quiénes están. Es de la lista de grupos y de ninguna otra: ahí las caras
// dicen quién sin abrir nada. El detalle no lo necesita (trae los aprendices enteros) y lo que
// ve un aprendiz tampoco: el nombre de sus compañeros no tiene nada que hacer en esa respuesta.
const groupColsRoster = groupCols + `,
  (select coalesce(array_agg(p.name order by p.name), '{}') from memberships a
     join people p on p.id = a.person_id where a.group_id=g.id and a.role='learner')`

func scanGroup(row pgx.CollectableRow) (domain.Group, error) {
	var g domain.Group
	return g, row.Scan(&g.ID, &g.SpaceID, &g.Name, &g.Description, &g.Tags, &g.Learners)
}

func scanGroupRoster(row pgx.CollectableRow) (domain.Group, error) {
	var g domain.Group
	return g, row.Scan(&g.ID, &g.SpaceID, &g.Name, &g.Description, &g.Tags, &g.Learners, &g.Names)
}

func (r *Repos) OfGuide(ctx context.Context, personID, spaceID string) ([]domain.Group, error) {
	rows, err := r.db.Query(ctx, `select `+groupColsRoster+` from groups g join memberships m on m.group_id=g.id
	  where m.person_id=$1 and m.role='guide' and ($2 = '' or g.space_id = $2::uuid) order by g.created_at desc`, personID, spaceID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanGroupRoster)
}

// Editar lo que un grupo dice de sí: el nombre y la descripción. Lo demás (quién está adentro,
// qué se le asignó) se toca por su propio camino.
func (r *Repos) UpdateGroup(ctx context.Context, id, name, description string) (*domain.Group, error) {
	if _, err := r.db.Exec(ctx, `update groups set name=$2, description=nullif($3,'') where id=$1`, id, name, description); err != nil {
		return nil, err
	}
	return r.ByID(ctx, id)
}

func (r *Repos) ByID(ctx context.Context, id string) (*domain.Group, error) {
	rows, err := r.db.Query(ctx, `select `+groupCols+` from groups g where g.id=$1`, id)
	if err != nil {
		return nil, err
	}
	g, err := pgx.CollectExactlyOneRow(rows, scanGroup)
	if err != nil {
		return nil, noRows(err)
	}
	return &g, nil
}

// ---- Lenses ----
func (r *Repos) All(ctx context.Context) ([]domain.Lens, error) {
	rows, err := r.db.Query(ctx, `select key, name, description, phases from lenses order by key`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Lens, error) {
		var l domain.Lens
		var phases []byte
		if err := row.Scan(&l.Key, &l.Name, &l.Description, &phases); err != nil {
			return l, err
		}
		return l, json.Unmarshal(phases, &l.Phases)
	})
}

// ---- Events ----
func (r *Repos) Emit(ctx context.Context, e domain.Event) error {
	payload, _ := json.Marshal(e.Payload)
	if e.Payload == nil {
		payload = []byte(`{}`)
	}
	if e.OccurredAt.IsZero() {
		e.OccurredAt = time.Now()
	}
	_, err := r.db.Exec(ctx, `insert into events(person_id, group_id, activity_id, verb, payload, source, occurred_at) values($1,$2,$3,$4,$5,$6,$7)`,
		e.PersonID, e.GroupID, e.ActivityID, e.Verb, payload, e.Source, e.OccurredAt)
	return err
}
