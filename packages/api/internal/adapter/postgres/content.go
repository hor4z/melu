package postgres

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"

	"melu/internal/domain"
)

// ---- Activities ----
type Activities struct{ r *Repos }

func (r *Repos) Activities() *Activities { return &Activities{r: r} }

const activityCols = `id, space_id, title, is_recipe, composition, document, rubric, authors, updated_at`

func scanActivity(row pgx.CollectableRow) (domain.Activity, error) {
	var a domain.Activity
	err := row.Scan(&a.ID, &a.SpaceID, &a.Title, &a.IsRecipe, &a.Composition, &a.Document, &a.Rubric, &a.Authors, &a.UpdatedAt)
	if a.Authors == nil {
		a.Authors = []string{}
	}
	return a, err
}

func (x *Activities) Recipes(ctx context.Context) ([]domain.Activity, error) {
	rows, err := x.r.db.Query(ctx, `select `+activityCols+` from activities where is_recipe and space_id is null order by created_at`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanActivity)
}

func (x *Activities) OfSpaces(ctx context.Context, ids []string) ([]domain.Activity, error) {
	if len(ids) == 0 {
		return []domain.Activity{}, nil
	}
	rows, err := x.r.db.Query(ctx, `select `+activityCols+` from activities where space_id = any($1::uuid[]) order by is_recipe, updated_at desc`, ids)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanActivity)
}

func (x *Activities) ByID(ctx context.Context, id string) (*domain.Activity, error) {
	rows, err := x.r.db.Query(ctx, `select `+activityCols+` from activities where id=$1`, id)
	if err != nil {
		return nil, err
	}
	a, err := pgx.CollectExactlyOneRow(rows, scanActivity)
	if err != nil {
		return nil, noRows(err)
	}
	return &a, nil
}

func (x *Activities) Create(ctx context.Context, a domain.Activity) (*domain.Activity, error) {
	if a.Composition == nil {
		a.Composition = json.RawMessage(`{}`)
	}
	err := x.r.db.QueryRow(ctx, `insert into activities(space_id, title, is_recipe, composition, document, rubric, authors) values($1,$2,$7,$3,$4,$5,$6::uuid[]) returning id, updated_at`,
		a.SpaceID, a.Title, a.Composition, a.Document, a.Rubric, a.Authors, a.IsRecipe).Scan(&a.ID, &a.UpdatedAt)
	return &a, err
}

func (x *Activities) Save(ctx context.Context, a domain.Activity) error {
	_, err := x.r.db.Exec(ctx, `update activities set title=$2, composition=$3, document=$4, rubric=$5, updated_at=now() where id=$1`,
		a.ID, a.Title, a.Composition, a.Document, a.Rubric)
	return err
}

// ---- Assignments ----
type Assignments struct{ r *Repos }

func (r *Repos) Assignments() *Assignments { return &Assignments{r: r} }

func (x *Assignments) Create(ctx context.Context, a domain.Assignment) (*domain.Assignment, error) {
	err := x.r.db.QueryRow(ctx, `insert into assignments(activity_id, group_id, document_snapshot, rubric_snapshot) values($1,$2,$3,$4) returning id, opens_at`,
		a.ActivityID, a.GroupID, a.Document, a.Rubric).Scan(&a.ID, &a.OpensAt)
	return &a, err
}

const assignmentCols = `s.id, s.activity_id, s.group_id, a.title, a.composition, s.opens_at, s.closes_at,
  (select count(*) from submissions e where e.assignment_id=s.id and e.status<>'in_progress'),
  (select count(*) from memberships m where m.group_id=s.group_id and m.role='learner')`

func scanAssignment(row pgx.CollectableRow) (domain.Assignment, error) {
	var a domain.Assignment
	return a, row.Scan(&a.ID, &a.ActivityID, &a.GroupID, &a.Title, &a.Composition, &a.OpensAt, &a.ClosesAt, &a.Submissions, &a.SubmissionsTotal)
}

func (x *Assignments) OfGroup(ctx context.Context, groupID string) ([]domain.Assignment, error) {
	rows, err := x.r.db.Query(ctx, `select `+assignmentCols+` from assignments s join activities a on a.id=s.activity_id where s.group_id=$1 order by s.opens_at desc`, groupID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanAssignment)
}

func (x *Assignments) OfLearner(ctx context.Context, learnerID string) ([]domain.Assignment, error) {
	rows, err := x.r.db.Query(ctx, `select `+assignmentCols+`, g.name, (select e.status from submissions e where e.assignment_id=s.id and e.learner_id=$1)
	  from assignments s join activities a on a.id=s.activity_id join groups g on g.id=s.group_id
	  join memberships m on m.group_id=s.group_id and m.person_id=$1 and m.role='learner'
	  where s.opens_at<=now() and (s.closes_at is null or s.closes_at>now()) order by s.opens_at desc`, learnerID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Assignment, error) {
		var a domain.Assignment
		return a, row.Scan(&a.ID, &a.ActivityID, &a.GroupID, &a.Title, &a.Composition, &a.OpensAt, &a.ClosesAt, &a.Submissions, &a.SubmissionsTotal, &a.GroupName, &a.MyStatus)
	})
}

func (x *Assignments) ByID(ctx context.Context, id string) (*domain.Assignment, error) {
	var a domain.Assignment
	err := x.r.db.QueryRow(ctx, `select `+assignmentCols+`, s.document_snapshot, s.rubric_snapshot, g.name from assignments s join activities a on a.id=s.activity_id join groups g on g.id=s.group_id where s.id=$1`, id).
		Scan(&a.ID, &a.ActivityID, &a.GroupID, &a.Title, &a.Composition, &a.OpensAt, &a.ClosesAt, &a.Submissions, &a.SubmissionsTotal, &a.Document, &a.Rubric, &a.GroupName)
	if err != nil {
		return nil, noRows(err)
	}
	return &a, nil
}

// ---- Submissions ----
type Submissions struct{ r *Repos }

func (r *Repos) Submissions() *Submissions { return &Submissions{r: r} }

const submissionCols = `e.id, e.assignment_id, e.learner_id, p.name, e.status, e.answers, e.artifacts, e.steps, e.scores, e.submitted_at, e.updated_at`

func scanSubmission(row pgx.CollectableRow) (domain.Submission, error) {
	var e domain.Submission
	return e, row.Scan(&e.ID, &e.AssignmentID, &e.LearnerID, &e.Learner, &e.Status, &e.Answers, &e.Artifacts, &e.Steps, &e.Scores, &e.SubmittedAt, &e.UpdatedAt)
}

func (x *Submissions) Open(ctx context.Context, assignmentID, learnerID string) (*domain.Submission, error) {
	if _, err := x.r.db.Exec(ctx, `insert into submissions(assignment_id, learner_id) values($1,$2) on conflict do nothing`, assignmentID, learnerID); err != nil {
		return nil, err
	}
	rows, err := x.r.db.Query(ctx, `select `+submissionCols+` from submissions e join people p on p.id=e.learner_id where e.assignment_id=$1 and e.learner_id=$2`, assignmentID, learnerID)
	if err != nil {
		return nil, err
	}
	e, err := pgx.CollectExactlyOneRow(rows, scanSubmission)
	if err != nil {
		return nil, noRows(err)
	}
	return &e, nil
}

func (x *Submissions) Save(ctx context.Context, e domain.Submission) error {
	_, err := x.r.db.Exec(ctx, `update submissions set status=$2, answers=$3, scores=$4, submitted_at=$5, steps=$6, updated_at=now() where id=$1`,
		e.ID, e.Status, e.Answers, e.Scores, e.SubmittedAt, e.Steps)
	return err
}

func (x *Submissions) OfAssignment(ctx context.Context, assignmentID string) ([]domain.Submission, error) {
	rows, err := x.r.db.Query(ctx, `select `+submissionCols+` from submissions e join people p on p.id=e.learner_id where e.assignment_id=$1 order by e.submitted_at nulls last, p.name`, assignmentID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanSubmission)
}

func (x *Submissions) ByID(ctx context.Context, id string) (*domain.Submission, error) {
	rows, err := x.r.db.Query(ctx, `select `+submissionCols+` from submissions e join people p on p.id=e.learner_id where e.id=$1`, id)
	if err != nil {
		return nil, err
	}
	e, err := pgx.CollectExactlyOneRow(rows, scanSubmission)
	if err != nil {
		return nil, noRows(err)
	}
	return &e, nil
}

// ---- Memberships ----
type Memberships struct{ r *Repos }

func (r *Repos) Memberships() *Memberships { return &Memberships{r: r} }

func (x *Memberships) Join(ctx context.Context, personID, spaceID, groupID string, role domain.Role) error {
	_, err := x.r.db.Exec(ctx, `insert into memberships(person_id, space_id, group_id, role) values($1,$2,$3,$4) on conflict do nothing`, personID, spaceID, groupID, role)
	return err
}

func (x *Memberships) GroupByCode(ctx context.Context, code string) (*domain.Group, error) {
	rows, err := x.r.db.Query(ctx, `select `+groupCols+` from groups g where upper(g.code)=upper($1)`, code)
	if err != nil {
		return nil, err
	}
	g, err := pgx.CollectExactlyOneRow(rows, scanGroup)
	if err != nil {
		return nil, noRows(err)
	}
	return &g, nil
}

func (x *Memberships) GroupsOfLearner(ctx context.Context, personID string) ([]domain.Group, error) {
	rows, err := x.r.db.Query(ctx, `select `+groupCols+` from groups g join memberships m on m.group_id=g.id where m.person_id=$1 and m.role='learner' order by g.created_at desc`, personID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, scanGroup)
}

func (x *Memberships) Learners(ctx context.Context, groupID string) ([]domain.Learner, error) {
	rows, err := x.r.db.Query(ctx, `select p.id, p.name from people p join memberships m on m.person_id=p.id where m.group_id=$1 and m.role='learner' order by p.name`, groupID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Learner, error) {
		var a domain.Learner
		return a, row.Scan(&a.ID, &a.Name)
	})
}
