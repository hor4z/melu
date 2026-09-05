package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"

	"melu/internal/domain"
)

type Dashboard struct{ r *Repos }

func (r *Repos) Dashboard() *Dashboard { return &Dashboard{r: r} }

// One row per submission, with the learner's first "mission.opened" and last "mission.submitted" for that activity.
const factSQL = `
select e.id, e.assignment_id, e.learner_id, p.name, g.id, g.name, a.title, e.status,
       coalesce(a.composition->>'experience', ''),
       (select min(v.occurred_at) from events v where v.person_id=e.learner_id and v.activity_id=s.activity_id and v.verb='mission.opened'),
       coalesce(e.submitted_at, (select max(v.occurred_at) from events v where v.person_id=e.learner_id and v.activity_id=s.activity_id and v.verb='mission.submitted')),
       e.answers, s.document_snapshot, e.steps, a.composition, e.updated_at
from submissions e
join assignments s on s.id=e.assignment_id
join activities a on a.id=s.activity_id
join groups g on g.id=s.group_id
join people p on p.id=e.learner_id
`

func scanFact(row pgx.CollectableRow) (domain.Fact, error) {
	var h domain.Fact
	err := row.Scan(&h.SubmissionID, &h.AssignmentID, &h.LearnerID, &h.Learner, &h.GroupID, &h.Group, &h.Title, &h.Status, &h.Experience, &h.OpenedAt, &h.SubmittedAt, &h.Answers, &h.Document, &h.Steps, &h.Composition, &h.UpdatedAt)
	return h, err
}

func (x *Dashboard) FactsOfGuide(ctx context.Context, guideID, spaceID string) ([]domain.Fact, error) {
	rows, err := x.r.db.Query(ctx, factSQL+` where exists (select 1 from memberships m where m.group_id=g.id and m.person_id=$1 and m.role='guide')
	  and ($2 = '' or g.space_id = $2::uuid) order by e.updated_at desc`, guideID, spaceID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanFact)
}

func (x *Dashboard) FactsOfLearner(ctx context.Context, learnerID string) ([]domain.Fact, error) {
	rows, err := x.r.db.Query(ctx, factSQL+` where e.learner_id=$1 order by e.updated_at desc`, learnerID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanFact)
}

func (x *Dashboard) HasAssignments(ctx context.Context, guideID string) bool {
	var n int
	x.r.db.QueryRow(ctx, `select count(*) from assignments s join memberships m on m.group_id=s.group_id where m.person_id=$1 and m.role='guide'`, guideID).Scan(&n)
	return n > 0
}
