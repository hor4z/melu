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
		return domain.ErrNoEncontrado
	}
	return err
}

// ---- Personas ----
type personaRow struct {
	ID, Nombre string
	Email, Sub *string
}

func (r personaRow) dom() *domain.Persona {
	p := &domain.Persona{ID: r.ID, Nombre: r.Nombre}
	if r.Email != nil {
		p.Email = *r.Email
	}
	if r.Sub != nil {
		p.GoogleSub = *r.Sub
	}
	return p
}

func (r *Repos) persona(ctx context.Context, where string, arg any) (*domain.Persona, error) {
	var row personaRow
	err := r.db.QueryRow(ctx, `select id, nombre, email, google_sub from persona where `+where, arg).
		Scan(&row.ID, &row.Nombre, &row.Email, &row.Sub)
	if err != nil {
		return nil, noRows(err)
	}
	return row.dom(), nil
}

func (r *Repos) PorGoogleSub(ctx context.Context, sub string) (*domain.Persona, error) {
	return r.persona(ctx, "google_sub=$1", sub)
}
func (r *Repos) PorEmail(ctx context.Context, email string) (*domain.Persona, error) {
	return r.persona(ctx, "email=$1", email)
}
func (r *Repos) Crear(ctx context.Context, p domain.Persona) (*domain.Persona, error) {
	var id string
	err := r.db.QueryRow(ctx, `insert into persona(email, google_sub, nombre) values(nullif($1,''), nullif($2,''), $3) returning id`,
		p.Email, p.GoogleSub, p.Nombre).Scan(&id)
	if err != nil {
		return nil, err
	}
	p.ID = id
	return &p, nil
}
func (r *Repos) VincularGoogle(ctx context.Context, id, sub string) error {
	_, err := r.db.Exec(ctx, `update persona set google_sub=$2 where id=$1`, id, sub)
	return err
}

// ---- Sesiones ----
func (r *Repos) CrearSesion(ctx context.Context, personaID string) (string, error) {
	b := make([]byte, 32)
	rand.Read(b)
	tok := hex.EncodeToString(b)
	_, err := r.db.Exec(ctx, `insert into sesion(token, persona_id, expira) values($1,$2,$3)`, tok, personaID, time.Now().Add(30*24*time.Hour))
	return tok, err
}
func (r *Repos) Resolver(ctx context.Context, token string) (*domain.Persona, error) {
	var row personaRow
	err := r.db.QueryRow(ctx, `select p.id, p.nombre, p.email, p.google_sub from sesion s join persona p on p.id=s.persona_id where s.token=$1 and s.expira>now()`, token).
		Scan(&row.ID, &row.Nombre, &row.Email, &row.Sub)
	if err != nil {
		return nil, noRows(err)
	}
	return row.dom(), nil
}
func (r *Repos) Borrar(ctx context.Context, token string) error {
	_, err := r.db.Exec(ctx, `delete from sesion where token=$1`, token)
	return err
}

// ---- Espacios ----
func (r *Repos) CrearEspacio(ctx context.Context, e domain.Espacio, creadorID string) (*domain.Espacio, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := tx.QueryRow(ctx, `insert into espacio(nombre, slug, tipo) values($1,$2,$3) returning id`, e.Nombre, e.Slug, e.Tipo).Scan(&e.ID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `insert into membresia(persona_id, espacio_id, rol) values($1,$2,'coordinador'),($1,$2,'guia')`, creadorID, e.ID); err != nil {
		return nil, err
	}
	return &e, tx.Commit(ctx)
}

func (r *Repos) DePersona(ctx context.Context, personaID string) ([]domain.Espacio, error) {
	rows, err := r.db.Query(ctx, `select distinct e.id, e.nombre, e.slug, e.tipo from espacio e join membresia m on m.espacio_id=e.id where m.persona_id=$1 order by e.nombre`, personaID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Espacio, error) {
		var e domain.Espacio
		return e, row.Scan(&e.ID, &e.Nombre, &e.Slug, &e.Tipo)
	})
}

func (r *Repos) membresiasDe(ctx context.Context, personaID string) ([]domain.Membresia, error) {
	rows, err := r.db.Query(ctx, `select espacio_id, grupo_id, rol from membresia where persona_id=$1`, personaID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Membresia, error) {
		var m domain.Membresia
		return m, row.Scan(&m.EspacioID, &m.GrupoID, &m.Rol)
	})
}

// ---- Grupos ----
func (r *Repos) CrearGrupo(ctx context.Context, g domain.Grupo, guiaID string) (*domain.Grupo, error) {
	if g.Etiquetas == nil {
		g.Etiquetas = json.RawMessage(`{}`)
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := tx.QueryRow(ctx, `insert into grupo(espacio_id, nombre, codigo, etiquetas) values($1,$2,$3,$4) returning id`, g.EspacioID, g.Nombre, g.Codigo, g.Etiquetas).Scan(&g.ID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `insert into membresia(persona_id, espacio_id, grupo_id, rol) values($1,$2,$3,'guia')`, guiaID, g.EspacioID, g.ID); err != nil {
		return nil, err
	}
	return &g, tx.Commit(ctx)
}

const grupoCols = `g.id, g.espacio_id, g.nombre, g.codigo, g.etiquetas,
  (select count(*) from membresia a where a.grupo_id=g.id and a.rol='aprendiz')`

func scanGrupo(row pgx.CollectableRow) (domain.Grupo, error) {
	var g domain.Grupo
	return g, row.Scan(&g.ID, &g.EspacioID, &g.Nombre, &g.Codigo, &g.Etiquetas, &g.Aprendices)
}

func (r *Repos) DeGuia(ctx context.Context, personaID string) ([]domain.Grupo, error) {
	rows, err := r.db.Query(ctx, `select `+grupoCols+` from grupo g join membresia m on m.grupo_id=g.id where m.persona_id=$1 and m.rol='guia' order by g.created_at desc`, personaID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanGrupo)
}

func (r *Repos) PorID(ctx context.Context, id string) (*domain.Grupo, error) {
	rows, err := r.db.Query(ctx, `select `+grupoCols+` from grupo g where g.id=$1`, id)
	if err != nil {
		return nil, err
	}
	g, err := pgx.CollectExactlyOneRow(rows, scanGrupo)
	if err != nil {
		return nil, noRows(err)
	}
	return &g, nil
}

// ---- Lentes ----
func (r *Repos) Todos(ctx context.Context) ([]domain.Lente, error) {
	rows, err := r.db.Query(ctx, `select clave, nombre, descripcion, fases from lente order by clave`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Lente, error) {
		var l domain.Lente
		var fases []byte
		if err := row.Scan(&l.Clave, &l.Nombre, &l.Descripcion, &fases); err != nil {
			return l, err
		}
		return l, json.Unmarshal(fases, &l.Fases)
	})
}

// ---- Eventos ----
func (r *Repos) Emitir(ctx context.Context, e domain.Evento) error {
	payload, _ := json.Marshal(e.Payload)
	if e.Payload == nil {
		payload = []byte(`{}`)
	}
	if e.Ocurrio.IsZero() {
		e.Ocurrio = time.Now()
	}
	_, err := r.db.Exec(ctx, `insert into evento(persona_id, grupo_id, actividad_id, verbo, payload, origen, ocurrio) values($1,$2,$3,$4,$5,$6,$7)`,
		e.PersonaID, e.GrupoID, e.ActividadID, e.Verbo, payload, e.Origen, e.Ocurrio)
	return err
}
