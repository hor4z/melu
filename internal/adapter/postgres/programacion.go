package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"

	"melu/internal/domain"
)

// ---- Series: la regla de repetición ----

type Series struct{ r *Repos }

func (r *Repos) Series() *Series { return &Series{r: r} }

func (x *Series) Crear(ctx context.Context, rep domain.Repeticion) (string, error) {
	dias := make([]int16, 0, len(rep.Dias))
	for _, d := range rep.Dias {
		dias = append(dias, int16(d))
	}
	var id string
	err := x.r.db.QueryRow(ctx, `insert into serie(dias, hora, dias_plazo, desde, hasta) values($1,$2,$3,$4,$5) returning id`,
		dias, rep.Hora, rep.Plazo, rep.Desde, rep.Hasta).Scan(&id)
	return id, err
}

func (x *Series) PorID(ctx context.Context, id string) (*domain.Repeticion, error) {
	var r domain.Repeticion
	var dias []int16
	var desde, hasta time.Time
	err := x.r.db.QueryRow(ctx, `select id, dias, hora, dias_plazo, desde, hasta from serie where id=$1`, id).
		Scan(&r.ID, &dias, &r.Hora, &r.Plazo, &desde, &hasta)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNoEncontrado
	}
	if err != nil {
		return nil, err
	}
	for _, d := range dias {
		r.Dias = append(r.Dias, int(d))
	}
	r.Desde, r.Hasta = desde.Format("2006-01-02"), hasta.Format("2006-01-02")
	return &r, nil
}

func (x *Series) Acortar(ctx context.Context, id string, hasta time.Time) error {
	_, err := x.r.db.Exec(ctx, `update serie set hasta=$2 where id=$1 and hasta > $2`, id, hasta)
	return err
}

// ---- Programación: lo que ve el docente ----

type Programacion struct{ r *Repos }

func (r *Repos) Programacion() *Programacion { return &Programacion{r: r} }

// Se usan left join agrupados y no las subqueries por fila de `asigCols`: acá se pide un rango,
// y una subquery correlacionada empeora linealmente por fila mientras el join agrupado no.
// `sin_corregir` es la cifra que el docente busca de verdad: entregado y todavía sin devolución.
const programadoSQL = `
select s.id, s.actividad_id, a.titulo, s.grupo_id, g.nombre, a.composicion, s.abre, s.cierra, s.serie_id,
       coalesce(h.entregadas, 0), coalesce(t.total, 0), coalesce(h.sin_corregir, 0)
from asignacion s
join actividad a on a.id = s.actividad_id
join grupo g on g.id = s.grupo_id
left join (select asignacion_id,
                  count(*) filter (where estado <> 'en_curso') as entregadas,
                  count(*) filter (where estado = 'entregada')  as sin_corregir
           from entrega group by asignacion_id) h on h.asignacion_id = s.id
left join (select grupo_id, count(*) as total from membresia
           where rol = 'aprendiz' group by grupo_id) t on t.grupo_id = s.grupo_id
where exists (select 1 from membresia m where m.grupo_id = s.grupo_id and m.persona_id = $1 and m.rol = 'guia')
  and ($2 = '' or g.espacio_id = $2::uuid)
  and s.abre >= $3 and s.abre < $4
order by s.abre
`

func (x *Programacion) DeGuia(ctx context.Context, guiaID, espacioID string, desde, hasta time.Time) ([]domain.Programado, error) {
	rows, err := x.r.db.Query(ctx, programadoSQL, guiaID, espacioID, desde, hasta)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Programado, error) {
		var p domain.Programado
		return p, row.Scan(&p.AsignacionID, &p.ActividadID, &p.Titulo, &p.GrupoID, &p.Grupo, &p.Composicion,
			&p.Abre, &p.Cierra, &p.SerieID, &p.Entregas, &p.Totales, &p.SinCorregir)
	})
}

func (x *Programacion) SerieDeAsignacion(ctx context.Context, asignacionID string) (string, error) {
	var grupoID string
	err := x.r.db.QueryRow(ctx, `select grupo_id from asignacion where id=$1`, asignacionID).Scan(&grupoID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", domain.ErrNoEncontrado
	}
	return grupoID, err
}

func (x *Programacion) EspaciosDeSerie(ctx context.Context, serieID string) ([]string, error) {
	rows, err := x.r.db.Query(ctx, `select distinct g.espacio_id from asignacion s join grupo g on g.id=s.grupo_id where s.serie_id=$1`, serieID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (string, error) {
		var id string
		return id, row.Scan(&id)
	})
}

// BorrarFuturasDeSerie borra las ocurrencias desde una fecha, salvo las que ya tienen alguna
// entrega: eso es trabajo de chicos y no se borra por reprogramar. Devuelve cuántas cayeron y
// cuántas se conservaron, para poder decírselo al docente en vez de hacerlo en silencio.
func (x *Programacion) BorrarFuturasDeSerie(ctx context.Context, serieID string, desde time.Time) (int, int, error) {
	var conservadas int
	if err := x.r.db.QueryRow(ctx, `select count(*) from asignacion s
	  where s.serie_id=$1 and s.abre >= $2 and exists (select 1 from entrega e where e.asignacion_id=s.id)`,
		serieID, desde).Scan(&conservadas); err != nil {
		return 0, 0, err
	}
	t, err := x.r.db.Exec(ctx, `delete from asignacion s
	  where s.serie_id=$1 and s.abre >= $2 and not exists (select 1 from entrega e where e.asignacion_id=s.id)`,
		serieID, desde)
	if err != nil {
		return 0, conservadas, err
	}
	return int(t.RowsAffected()), conservadas, nil
}
