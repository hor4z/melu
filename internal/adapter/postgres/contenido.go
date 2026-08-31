package postgres

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"

	"melu/internal/domain"
)

// ---- Actividades ----
type Actividades struct{ r *Repos }

func (r *Repos) Actividades() *Actividades { return &Actividades{r: r} }

const actCols = `id, espacio_id, titulo, es_receta, composicion, documento, rubrica, autores, updated_at`

func scanAct(row pgx.CollectableRow) (domain.Actividad, error) {
	var a domain.Actividad
	err := row.Scan(&a.ID, &a.EspacioID, &a.Titulo, &a.EsReceta, &a.Composicion, &a.Documento, &a.Rubrica, &a.Autores, &a.UpdatedAt)
	if a.Autores == nil {
		a.Autores = []string{}
	}
	return a, err
}

func (x *Actividades) Recetas(ctx context.Context) ([]domain.Actividad, error) {
	rows, err := x.r.db.Query(ctx, `select `+actCols+` from actividad where es_receta and espacio_id is null order by created_at`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanAct)
}

func (x *Actividades) DeEspacios(ctx context.Context, ids []string) ([]domain.Actividad, error) {
	if len(ids) == 0 {
		return []domain.Actividad{}, nil
	}
	rows, err := x.r.db.Query(ctx, `select `+actCols+` from actividad where espacio_id = any($1::uuid[]) order by es_receta, updated_at desc`, ids)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanAct)
}

func (x *Actividades) PorID(ctx context.Context, id string) (*domain.Actividad, error) {
	rows, err := x.r.db.Query(ctx, `select `+actCols+` from actividad where id=$1`, id)
	if err != nil {
		return nil, err
	}
	a, err := pgx.CollectExactlyOneRow(rows, scanAct)
	if err != nil {
		return nil, noRows(err)
	}
	return &a, nil
}

func (x *Actividades) Crear(ctx context.Context, a domain.Actividad) (*domain.Actividad, error) {
	if a.Composicion == nil {
		a.Composicion = json.RawMessage(`{}`)
	}
	err := x.r.db.QueryRow(ctx, `insert into actividad(espacio_id, titulo, es_receta, composicion, documento, rubrica, autores) values($1,$2,$7,$3,$4,$5,$6::uuid[]) returning id, updated_at`,
		a.EspacioID, a.Titulo, a.Composicion, a.Documento, a.Rubrica, a.Autores, a.EsReceta).Scan(&a.ID, &a.UpdatedAt)
	return &a, err
}

func (x *Actividades) Guardar(ctx context.Context, a domain.Actividad) error {
	_, err := x.r.db.Exec(ctx, `update actividad set titulo=$2, composicion=$3, documento=$4, rubrica=$5, updated_at=now() where id=$1`,
		a.ID, a.Titulo, a.Composicion, a.Documento, a.Rubrica)
	return err
}

// ---- Asignaciones ----
type Asignaciones struct{ r *Repos }

func (r *Repos) Asignaciones() *Asignaciones { return &Asignaciones{r: r} }

// Crear no cambió de firma: `domain.Asignacion` ya traía Abre y Cierra desde 0001, solo que
// nadie las llenaba. El coalesce hace que no pasar fecha siga significando «ahora», así que las
// llamadas que no programan se comportan igual que antes.
func (x *Asignaciones) Crear(ctx context.Context, a domain.Asignacion) (*domain.Asignacion, error) {
	var abre *time.Time
	if !a.Abre.IsZero() {
		abre = &a.Abre
	}
	err := x.r.db.QueryRow(ctx, `insert into asignacion(actividad_id, grupo_id, documento_snapshot, rubrica_snapshot, abre, cierra, serie_id)
	  values($1,$2,$3,$4, coalesce($5, now()), $6, $7) returning id, abre`,
		a.ActividadID, a.GrupoID, a.Documento, a.Rubrica, abre, a.Cierra, a.SerieID).Scan(&a.ID, &a.Abre)
	return &a, err
}

func (x *Asignaciones) Reprogramar(ctx context.Context, id string, abre time.Time, cierra *time.Time) error {
	t, err := x.r.db.Exec(ctx, `update asignacion set abre=$2, cierra=$3 where id=$1`, id, abre, cierra)
	if err != nil {
		return err
	}
	if t.RowsAffected() == 0 {
		return domain.ErrNoEncontrado
	}
	return nil
}

const asigCols = `s.id, s.actividad_id, s.grupo_id, a.titulo, a.composicion, s.abre, s.cierra, s.serie_id,
  (select count(*) from entrega e where e.asignacion_id=s.id and e.estado<>'en_curso'),
  (select count(*) from membresia m where m.grupo_id=s.grupo_id and m.rol='aprendiz')`

func scanAsig(row pgx.CollectableRow) (domain.Asignacion, error) {
	var a domain.Asignacion
	return a, row.Scan(&a.ID, &a.ActividadID, &a.GrupoID, &a.Titulo, &a.Composicion, &a.Abre, &a.Cierra, &a.SerieID, &a.Entregas, &a.EntregasTotales)
}

func (x *Asignaciones) DeGrupo(ctx context.Context, grupoID string) ([]domain.Asignacion, error) {
	rows, err := x.r.db.Query(ctx, `select `+asigCols+` from asignacion s join actividad a on a.id=s.actividad_id where s.grupo_id=$1 order by s.abre desc`, grupoID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanAsig)
}

// DeAprendiz ya no filtra por vencimiento. El filtro que estaba acá hacía dos daños silenciosos:
// lo vencido sin entregar desaparecía sin aviso, y lo que abre mañana no llegaba nunca al
// cliente. Ahora agrupa el caso de uso, que es quien sabe qué significa «atrasado».
func (x *Asignaciones) DeAprendiz(ctx context.Context, aprendizID string, hasta time.Time) ([]domain.Asignacion, error) {
	rows, err := x.r.db.Query(ctx, `select `+asigCols+`, g.nombre, (select e.estado from entrega e where e.asignacion_id=s.id and e.aprendiz_id=$1)
	  from asignacion s join actividad a on a.id=s.actividad_id join grupo g on g.id=s.grupo_id
	  join membresia m on m.grupo_id=s.grupo_id and m.persona_id=$1 and m.rol='aprendiz'
	  where s.abre <= $2 order by s.abre desc`, aprendizID, hasta)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Asignacion, error) {
		var a domain.Asignacion
		return a, row.Scan(&a.ID, &a.ActividadID, &a.GrupoID, &a.Titulo, &a.Composicion, &a.Abre, &a.Cierra, &a.SerieID, &a.Entregas, &a.EntregasTotales, &a.GrupoNombre, &a.MiEstado)
	})
}

func (x *Asignaciones) PorID(ctx context.Context, id string) (*domain.Asignacion, error) {
	var a domain.Asignacion
	err := x.r.db.QueryRow(ctx, `select `+asigCols+`, s.documento_snapshot, s.rubrica_snapshot, g.nombre from asignacion s join actividad a on a.id=s.actividad_id join grupo g on g.id=s.grupo_id where s.id=$1`, id).
		Scan(&a.ID, &a.ActividadID, &a.GrupoID, &a.Titulo, &a.Composicion, &a.Abre, &a.Cierra, &a.SerieID, &a.Entregas, &a.EntregasTotales, &a.Documento, &a.Rubrica, &a.GrupoNombre)
	if err != nil {
		return nil, noRows(err)
	}
	return &a, nil
}

// ---- Entregas ----
type Entregas struct{ r *Repos }

func (r *Repos) Entregas() *Entregas { return &Entregas{r: r} }

const entCols = `e.id, e.asignacion_id, e.aprendiz_id, p.nombre, e.estado, e.respuestas, e.artefactos, e.pasos, e.puntajes, e.entregada_at, e.updated_at`

func scanEnt(row pgx.CollectableRow) (domain.Entrega, error) {
	var e domain.Entrega
	return e, row.Scan(&e.ID, &e.AsignacionID, &e.AprendizID, &e.Aprendiz, &e.Estado, &e.Respuestas, &e.Artefactos, &e.Pasos, &e.Puntajes, &e.EntregadaAt, &e.UpdatedAt)
}

func (x *Entregas) Abrir(ctx context.Context, asignacionID, aprendizID string) (*domain.Entrega, error) {
	if _, err := x.r.db.Exec(ctx, `insert into entrega(asignacion_id, aprendiz_id) values($1,$2) on conflict do nothing`, asignacionID, aprendizID); err != nil {
		return nil, err
	}
	rows, err := x.r.db.Query(ctx, `select `+entCols+` from entrega e join persona p on p.id=e.aprendiz_id where e.asignacion_id=$1 and e.aprendiz_id=$2`, asignacionID, aprendizID)
	if err != nil {
		return nil, err
	}
	e, err := pgx.CollectExactlyOneRow(rows, scanEnt)
	if err != nil {
		return nil, noRows(err)
	}
	return &e, nil
}

func (x *Entregas) Guardar(ctx context.Context, e domain.Entrega) error {
	_, err := x.r.db.Exec(ctx, `update entrega set estado=$2, respuestas=$3, puntajes=$4, entregada_at=$5, pasos=$6, updated_at=now() where id=$1`,
		e.ID, e.Estado, e.Respuestas, e.Puntajes, e.EntregadaAt, e.Pasos)
	return err
}

func (x *Entregas) DeAsignacion(ctx context.Context, asignacionID string) ([]domain.Entrega, error) {
	rows, err := x.r.db.Query(ctx, `select `+entCols+` from entrega e join persona p on p.id=e.aprendiz_id where e.asignacion_id=$1 order by e.entregada_at nulls last, p.nombre`, asignacionID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanEnt)
}

func (x *Entregas) PorID(ctx context.Context, id string) (*domain.Entrega, error) {
	rows, err := x.r.db.Query(ctx, `select `+entCols+` from entrega e join persona p on p.id=e.aprendiz_id where e.id=$1`, id)
	if err != nil {
		return nil, err
	}
	e, err := pgx.CollectExactlyOneRow(rows, scanEnt)
	if err != nil {
		return nil, noRows(err)
	}
	return &e, nil
}

// ---- Membresias ----
type Membresias struct{ r *Repos }

func (r *Repos) Membresias() *Membresias { return &Membresias{r: r} }

func (x *Membresias) Unir(ctx context.Context, personaID, espacioID, grupoID string, rol domain.Rol) error {
	_, err := x.r.db.Exec(ctx, `insert into membresia(persona_id, espacio_id, grupo_id, rol) values($1,$2,$3,$4) on conflict do nothing`, personaID, espacioID, grupoID, rol)
	return err
}

func (x *Membresias) GrupoPorCodigo(ctx context.Context, codigo string) (*domain.Grupo, error) {
	rows, err := x.r.db.Query(ctx, `select `+grupoCols+` from grupo g where upper(g.codigo)=upper($1)`, codigo)
	if err != nil {
		return nil, err
	}
	g, err := pgx.CollectExactlyOneRow(rows, scanGrupo)
	if err != nil {
		return nil, noRows(err)
	}
	return &g, nil
}

func (x *Membresias) GruposDeAprendiz(ctx context.Context, personaID string) ([]domain.Grupo, error) {
	rows, err := x.r.db.Query(ctx, `select `+grupoCols+` from grupo g join membresia m on m.grupo_id=g.id where m.persona_id=$1 and m.rol='aprendiz' order by g.created_at desc`, personaID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanGrupo)
}

func (x *Membresias) Aprendices(ctx context.Context, grupoID string) ([]domain.Aprendiz, error) {
	rows, err := x.r.db.Query(ctx, `select p.id, p.nombre from persona p join membresia m on m.persona_id=p.id where m.grupo_id=$1 and m.rol='aprendiz' order by p.nombre`, grupoID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Aprendiz, error) {
		var a domain.Aprendiz
		return a, row.Scan(&a.ID, &a.Nombre)
	})
}
