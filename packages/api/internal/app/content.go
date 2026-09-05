package app

import (
	"context"
	"encoding/json"
	"time"

	"melu/internal/domain"
)

// ---- what a person sees on the way in ----

type Me struct {
	Person      domain.Person       `json:"person"`
	Mode        string              `json:"mode"` // guide | learner | new
	Spaces      []domain.Space      `json:"spaces"`
	Memberships []domain.Membership `json:"memberships"`
	Profile     bool                `json:"profile"` // already went through the "how I learn" onboarding
}

func (s *Services) Me(ctx context.Context, p domain.Person) (*Me, error) {
	c, err := s.Account(ctx, p)
	if err != nil {
		return nil, err
	}
	mode := "new"
	for _, m := range c.Memberships {
		switch m.Role {
		case domain.RoleGuide, domain.RoleCoordinator:
			mode = "guide"
		case domain.RoleLearner:
			if mode == "new" {
				mode = "learner"
			}
		}
	}
	hasProfile := false
	if _, err := s.Profiles.ByPerson(ctx, p.ID); err == nil {
		hasProfile = true
	}
	return &Me{Person: p, Mode: mode, Spaces: c.Spaces, Memberships: c.Memberships, Profile: hasProfile}, nil
}

// Join: a signed-in person enters a group with its code, as a learner.
func (s *Services) Join(ctx context.Context, p domain.Person, code string) (*domain.Group, error) {
	g, err := s.Memberships.GroupByCode(ctx, code)
	if err != nil {
		return nil, err
	}
	if err := s.Memberships.Join(ctx, p.ID, g.SpaceID, g.ID, domain.RoleLearner); err != nil {
		return nil, err
	}
	_ = s.Events.Emit(ctx, domain.Event{PersonID: &p.ID, GroupID: &g.ID, Verb: "group.joined", Source: "observed", OccurredAt: time.Now()})
	return g, nil
}

// ---- activities (guide) ----

func (s *Services) Library(ctx context.Context, p domain.Person, spaceID string) (recipes, mine []domain.Activity, err error) {
	recipes, err = s.Activities.Recipes(ctx)
	if err != nil {
		return
	}
	spaces, err := s.Spaces.OfPerson(ctx, p.ID)
	if err != nil {
		return
	}
	ids := make([]string, 0, len(spaces))
	for _, e := range spaces {
		if spaceID == "" || e.ID == spaceID {
			ids = append(ids, e.ID)
		}
	}
	mine, err = s.Activities.OfSpaces(ctx, ids)
	return
}

type NewActivity struct {
	SpaceID     string          `json:"spaceId"`
	Title       string          `json:"title"`
	FromRecipe  string          `json:"fromRecipe"` // id of the recipe to duplicate, optional
	Composition json.RawMessage `json:"composition"`
}

func (s *Services) CreateActivity(ctx context.Context, p domain.Person, in NewActivity) (*domain.Activity, error) {
	if !s.isMember(ctx, p.ID, in.SpaceID, domain.RoleGuide, domain.RoleCoordinator) {
		return nil, domain.ErrNotAllowed
	}
	a := domain.Activity{SpaceID: &in.SpaceID, Title: in.Title, Authors: []string{p.ID}}
	if in.FromRecipe != "" {
		r, err := s.Activities.ByID(ctx, in.FromRecipe)
		if err != nil {
			return nil, err
		}
		a.Composition, a.Document, a.Rubric = r.Composition, r.Document, r.Rubric
		if a.Title == "" {
			a.Title = r.Title
		}
	} else {
		a.Composition = in.Composition
		a.Document = s.documentFromLens(ctx, in.Composition)
		a.Rubric = json.RawMessage(`[]`)
	}
	if a.Title == "" {
		a.Title = "Sin título"
	}
	out, err := s.Activities.Create(ctx, a)
	if err != nil {
		return nil, err
	}
	_ = s.Events.Emit(ctx, domain.Event{PersonID: &p.ID, ActivityID: &out.ID, Verb: "activity.created", Payload: map[string]any{"fromRecipe": in.FromRecipe}, Source: "observed", OccurredAt: time.Now()})
	return out, nil
}

// documentFromLens builds an empty document with the phases the chosen lens brings.
func (s *Services) documentFromLens(ctx context.Context, comp json.RawMessage) json.RawMessage {
	var c struct {
		Lens string `json:"lens"`
	}
	json.Unmarshal(comp, &c)
	lenses, _ := s.Lenses.All(ctx)
	type phase struct {
		Key, Name, Asks string
		Blocks          []any `json:"blocks"`
	}
	phases := []map[string]any{}
	for _, l := range lenses {
		if l.Key == c.Lens {
			for _, f := range l.Phases {
				phases = append(phases, map[string]any{"key": f.Key, "name": f.Name, "asks": f.Asks, "blocks": []any{}})
			}
		}
	}
	if len(phases) == 0 {
		phases = append(phases, map[string]any{"key": "single", "name": "Actividad", "asks": "", "blocks": []any{}})
	}
	b, _ := json.Marshal(map[string]any{"phases": phases})
	return b
}

func (s *Services) ViewActivity(ctx context.Context, p domain.Person, id string) (*domain.Activity, error) {
	a, err := s.Activities.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !a.IsRecipe && !s.isMember(ctx, p.ID, *a.SpaceID, domain.RoleGuide, domain.RoleCoordinator) {
		return nil, domain.ErrNotAllowed
	}
	return a, nil
}

func (s *Services) SaveActivity(ctx context.Context, p domain.Person, a domain.Activity) error {
	current, err := s.ViewActivity(ctx, p, a.ID)
	if err != nil {
		return err
	}
	if current.IsRecipe {
		return domain.ErrNotAllowed
	}
	current.Title, current.Composition, current.Document, current.Rubric = a.Title, a.Composition, a.Document, a.Rubric
	if err := s.Activities.Save(ctx, *current); err != nil {
		return err
	}
	return s.Events.Emit(ctx, domain.Event{PersonID: &p.ID, ActivityID: &a.ID, Verb: "activity.edited", Source: "observed", OccurredAt: time.Now()})
}

// ---- assign ----

func (s *Services) Assign(ctx context.Context, p domain.Person, activityID, groupID string) (*domain.Assignment, error) {
	a, err := s.ViewActivity(ctx, p, activityID)
	if err != nil {
		return nil, err
	}
	g, err := s.Groups.ByID(ctx, groupID)
	if err != nil {
		return nil, err
	}
	if !s.isMember(ctx, p.ID, g.SpaceID, domain.RoleGuide, domain.RoleCoordinator) {
		return nil, domain.ErrNotAllowed
	}
	as, err := s.Assignments.Create(ctx, domain.Assignment{ActivityID: a.ID, GroupID: g.ID, Document: a.Document, Rubric: a.Rubric})
	if err != nil {
		return nil, err
	}
	_ = s.Events.Emit(ctx, domain.Event{PersonID: &p.ID, GroupID: &g.ID, ActivityID: &a.ID, Verb: "activity.assigned", Payload: map[string]any{"assignmentId": as.ID}, Source: "observed", OccurredAt: time.Now()})
	return as, nil
}

// ---- doing (learner) ----

type Room struct {
	Group    domain.Group        `json:"group"`
	Missions []domain.Assignment `json:"missions"`
}

func (s *Services) Today(ctx context.Context, p domain.Person) ([]Room, error) {
	groups, err := s.Memberships.GroupsOfLearner(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	assignments, err := s.Assignments.OfLearner(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	rooms := make([]Room, 0, len(groups))
	for _, g := range groups {
		room := Room{Group: g, Missions: []domain.Assignment{}}
		for _, a := range assignments {
			if a.GroupID == g.ID {
				room.Missions = append(room.Missions, a)
			}
		}
		rooms = append(rooms, room)
	}
	return rooms, nil
}

type Mission struct {
	Assignment domain.Assignment `json:"assignment"`
	Submission domain.Submission `json:"submission"`
}

func (s *Services) OpenMission(ctx context.Context, p domain.Person, assignmentID string) (*Mission, error) {
	a, err := s.Assignments.ByID(ctx, assignmentID)
	if err != nil {
		return nil, err
	}
	e, err := s.Submissions.Open(ctx, a.ID, p.ID)
	if err != nil {
		return nil, err
	}
	if e.Status == "in_progress" && len(e.Answers) <= 2 {
		_ = s.Events.Emit(ctx, domain.Event{PersonID: &p.ID, GroupID: &a.GroupID, ActivityID: &a.ActivityID, Verb: "mission.opened", Source: "observed", OccurredAt: time.Now()})
	}
	return &Mission{Assignment: *a, Submission: *e}, nil
}

func (s *Services) SaveAnswers(ctx context.Context, p domain.Person, submissionID string, answers, steps json.RawMessage, submitting bool) (*domain.Submission, error) {
	e, err := s.Submissions.ByID(ctx, submissionID)
	if err != nil {
		return nil, err
	}
	if e.LearnerID != p.ID {
		return nil, domain.ErrNotAllowed
	}
	e.Answers = answers
	if len(steps) > 0 {
		e.Steps = steps
	}
	verb := "answer.saved"
	if submitting && e.Status == "in_progress" {
		now := time.Now()
		e.Status, e.SubmittedAt, verb = "submitted", &now, "mission.submitted"
	}
	if err := s.Submissions.Save(ctx, *e); err != nil {
		return nil, err
	}
	a, _ := s.Assignments.ByID(ctx, e.AssignmentID)
	var gid, aid *string
	if a != nil {
		gid, aid = &a.GroupID, &a.ActivityID
	}
	_ = s.Events.Emit(ctx, domain.Event{PersonID: &p.ID, GroupID: gid, ActivityID: aid, Verb: verb, Payload: map[string]any{"submissionId": e.ID}, Source: "observed", OccurredAt: time.Now()})
	return e, nil
}

// ---- grading (guide) ----

func (s *Services) SubmissionsOf(ctx context.Context, p domain.Person, assignmentID string) (*domain.Assignment, []domain.Submission, error) {
	a, err := s.Assignments.ByID(ctx, assignmentID)
	if err != nil {
		return nil, nil, err
	}
	g, err := s.Groups.ByID(ctx, a.GroupID)
	if err != nil {
		return nil, nil, err
	}
	if !s.isMember(ctx, p.ID, g.SpaceID, domain.RoleGuide, domain.RoleCoordinator) {
		return nil, nil, domain.ErrNotAllowed
	}
	es, err := s.Submissions.OfAssignment(ctx, a.ID)
	return a, es, err
}

func (s *Services) ScoreSubmission(ctx context.Context, p domain.Person, submissionID string, scores json.RawMessage) error {
	e, err := s.Submissions.ByID(ctx, submissionID)
	if err != nil {
		return err
	}
	a, _, err := s.SubmissionsOf(ctx, p, e.AssignmentID)
	if err != nil {
		return err
	}
	e.Scores, e.Status = scores, "graded"
	if err := s.Submissions.Save(ctx, *e); err != nil {
		return err
	}
	return s.Events.Emit(ctx, domain.Event{PersonID: &e.LearnerID, GroupID: &a.GroupID, ActivityID: &a.ActivityID, Verb: "rubric.scored", Payload: map[string]any{"submissionId": e.ID, "by": p.ID}, Source: "observed", OccurredAt: time.Now()})
}

func (s *Services) GroupDetail(ctx context.Context, p domain.Person, id string) (*domain.Group, []domain.Assignment, []domain.Learner, error) {
	g, err := s.Groups.ByID(ctx, id)
	if err != nil {
		return nil, nil, nil, err
	}
	if !s.isMember(ctx, p.ID, g.SpaceID, domain.RoleGuide, domain.RoleCoordinator) {
		return nil, nil, nil, domain.ErrNotAllowed
	}
	as, err := s.Assignments.OfGroup(ctx, g.ID)
	if err != nil {
		return nil, nil, nil, err
	}
	ap, err := s.Memberships.Learners(ctx, g.ID)
	return g, as, ap, err
}

// SaveAsTemplate duplicates the activity as a recipe of the space.
func (s *Services) SaveAsTemplate(ctx context.Context, p domain.Person, id string) (*domain.Activity, error) {
	a, err := s.ViewActivity(ctx, p, id)
	if err != nil {
		return nil, err
	}
	r := domain.Activity{SpaceID: a.SpaceID, Title: a.Title, IsRecipe: true, Composition: a.Composition, Document: a.Document, Rubric: a.Rubric, Authors: []string{p.ID}}
	out, err := s.Activities.Create(ctx, r)
	if err != nil {
		return nil, err
	}
	_ = s.Events.Emit(ctx, domain.Event{PersonID: &p.ID, ActivityID: &out.ID, Verb: "template.created", Source: "observed", OccurredAt: time.Now()})
	return out, nil
}
