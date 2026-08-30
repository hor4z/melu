package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"

	"melu/internal/domain"
)

type Panel struct{ r *Repos }

func (r *Repos) Panel() *Panel { return &Panel{r: r} }

// Una fila por entrega, con el primer "mision.abierta" y el último "mision.entregada" del aprendiz para esa actividad.
const hechoSQL = `
select e.id, e.asignacion_id, e.aprendiz_id, p.nombre, g.id, g.nombre, a.titulo, e.estado,
       coalesce(a.composicion->>'experiencia', ''),
       (select min(v.ocurrio) from evento v where v.persona_id=e.aprendiz_id and v.actividad_id=s.actividad_id and v.verbo='mision.abierta'),
       coalesce(e.entregada_at, (select max(v.ocurrio) from evento v where v.persona_id=e.aprendiz_id and v.actividad_id=s.actividad_id and v.verbo='mision.entregada')),
       e.respuestas, s.documento_snapshot, e.updated_at
from entrega e
join asignacion s on s.id=e.asignacion_id
join actividad a on a.id=s.actividad_id
join grupo g on g.id=s.grupo_id
join persona p on p.id=e.aprendiz_id
`

func scanHecho(row pgx.CollectableRow) (domain.Hecho, error) {
	var h domain.Hecho
	err := row.Scan(&h.EntregaID, &h.AsignacionID, &h.AprendizID, &h.Aprendiz, &h.GrupoID, &h.Grupo, &h.Titulo, &h.Estado, &h.Experiencia, &h.Abierta, &h.Entregada, &h.Respuestas, &h.Documento, &h.Actualizada)
	return h, err
}

func (x *Panel) HechosDeGuia(ctx context.Context, guiaID string) ([]domain.Hecho, error) {
	rows, err := x.r.db.Query(ctx, hechoSQL+` where exists (select 1 from membresia m where m.grupo_id=g.id and m.persona_id=$1 and m.rol='guia') order by e.updated_at desc`, guiaID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanHecho)
}

func (x *Panel) HechosDeAprendiz(ctx context.Context, aprendizID string) ([]domain.Hecho, error) {
	rows, err := x.r.db.Query(ctx, hechoSQL+` where e.aprendiz_id=$1 order by e.updated_at desc`, aprendizID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanHecho)
}

func (x *Panel) HayAsignaciones(ctx context.Context, guiaID string) bool {
	var n int
	x.r.db.QueryRow(ctx, `select count(*) from asignacion s join membresia m on m.grupo_id=s.grupo_id where m.persona_id=$1 and m.rol='guia'`, guiaID).Scan(&n)
	return n > 0
}
