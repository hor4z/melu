package port

import (
	"context"

	"melu/internal/domain"
)

type People interface {
	ByGoogleSub(ctx context.Context, sub string) (*domain.Person, error)
	ByEmail(ctx context.Context, email string) (*domain.Person, error)
	Create(ctx context.Context, p domain.Person) (*domain.Person, error)
	LinkGoogle(ctx context.Context, id, sub string) error
}

type Sessions interface {
	Create(ctx context.Context, personID string) (token string, err error)
	Resolve(ctx context.Context, token string) (*domain.Person, error)
	Delete(ctx context.Context, token string) error
}

type Spaces interface {
	Create(ctx context.Context, e domain.Space, creatorID string) (*domain.Space, error)
	OfPerson(ctx context.Context, personID string) ([]domain.Space, error)
	Memberships(ctx context.Context, personID string) ([]domain.Membership, error)
}

type Groups interface {
	Create(ctx context.Context, g domain.Group, guideID string) (*domain.Group, error)
	OfGuide(ctx context.Context, personID, spaceID string) ([]domain.Group, error)
	ByID(ctx context.Context, id string) (*domain.Group, error)
}

type Lenses interface {
	All(ctx context.Context) ([]domain.Lens, error)
}

type Events interface {
	Emit(ctx context.Context, e domain.Event) error
}

type Activities interface {
	Recipes(ctx context.Context) ([]domain.Activity, error)
	OfSpaces(ctx context.Context, espacioIDs []string) ([]domain.Activity, error)
	ByID(ctx context.Context, id string) (*domain.Activity, error)
	Create(ctx context.Context, a domain.Activity) (*domain.Activity, error)
	Save(ctx context.Context, a domain.Activity) error
}

type Assignments interface {
	Create(ctx context.Context, a domain.Assignment) (*domain.Assignment, error)
	OfGroup(ctx context.Context, groupID string) ([]domain.Assignment, error)
	OfLearner(ctx context.Context, learnerID string) ([]domain.Assignment, error)
	ByID(ctx context.Context, id string) (*domain.Assignment, error)
}

type Submissions interface {
	Open(ctx context.Context, assignmentID, learnerID string) (*domain.Submission, error)
	Save(ctx context.Context, e domain.Submission) error
	OfAssignment(ctx context.Context, assignmentID string) ([]domain.Submission, error)
	ByID(ctx context.Context, id string) (*domain.Submission, error)
}

type Memberships interface {
	Join(ctx context.Context, personID, spaceID, groupID string, role domain.Role) error
	GroupByCode(ctx context.Context, code string) (*domain.Group, error)
	GroupsOfLearner(ctx context.Context, personID string) ([]domain.Group, error)
	Learners(ctx context.Context, groupID string) ([]domain.Learner, error)
}

type Dashboard interface {
	FactsOfGuide(ctx context.Context, guideID, spaceID string) ([]domain.Fact, error)
	FactsOfLearner(ctx context.Context, learnerID string) ([]domain.Fact, error)
	HasAssignments(ctx context.Context, guideID string) bool
}

type Profiles interface {
	ByPerson(ctx context.Context, personID string) (*domain.Profile, error)
	Save(ctx context.Context, p domain.Profile) error
	OfGroup(ctx context.Context, groupID string) (map[string]domain.Profile, error)
}
