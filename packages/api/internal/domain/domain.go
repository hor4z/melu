// Package domain defines the entities and rules of the system. It imports nothing outside the stdlib.
package domain

import (
	"encoding/json"
	"errors"
	"time"
)

var (
	ErrNotFound   = errors.New("not found")
	ErrNotAllowed = errors.New("not allowed")
	ErrInvalid    = errors.New("invalid")
)

type Role string

const (
	RoleGuide       Role = "guide"
	RoleLearner     Role = "learner"
	RoleCompanion   Role = "companion"
	RoleCoordinator Role = "coordinator"
)

type Person struct {
	ID        string
	Email     string
	GoogleSub string
	Name      string
}

type Space struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
	Kind string `json:"kind"`
}

type Group struct {
	ID       string          `json:"id"`
	SpaceID  string          `json:"spaceId"`
	Name     string          `json:"name"`
	Code     string          `json:"code"`
	Tags     json.RawMessage `json:"tags"`
	Learners int             `json:"learners"`
}

type Membership struct {
	SpaceID string  `json:"spaceId"`
	GroupID *string `json:"groupId"`
	Role    Role    `json:"role"`
}

type Phase struct {
	Key  string `json:"key"`
	Name string `json:"name"`
	Asks string `json:"asks"`
}

type Lens struct {
	Key         string  `json:"key"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Phases      []Phase `json:"phases"`
}

// Event is the immutable fact everything else is derived from.
type Event struct {
	PersonID   *string
	GroupID    *string
	ActivityID *string
	Verb       string
	Payload    any
	Source     string // observed | declared | inferred
	OccurredAt time.Time
}

func ValidateName(s string) error {
	if len(s) < 2 || len(s) > 120 {
		return ErrInvalid
	}
	return nil
}

// ---- content and the loop ----

type Activity struct {
	ID          string          `json:"id"`
	SpaceID     *string         `json:"spaceId"`
	Title       string          `json:"title"`
	IsRecipe    bool            `json:"isRecipe"`
	Composition json.RawMessage `json:"composition"`
	Document    json.RawMessage `json:"document"`
	Rubric      json.RawMessage `json:"rubric"`
	Authors     []string        `json:"authors"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

type Assignment struct {
	ID               string          `json:"id"`
	ActivityID       string          `json:"activityId"`
	GroupID          string          `json:"groupId"`
	Title            string          `json:"title"`
	Composition      json.RawMessage `json:"composition"`
	Document         json.RawMessage `json:"document,omitempty"`
	Rubric           json.RawMessage `json:"rubric,omitempty"`
	OpensAt          time.Time       `json:"opensAt"`
	ClosesAt         *time.Time      `json:"closesAt"`
	Submissions      int             `json:"submissions"`
	SubmissionsTotal int             `json:"submissionsTotal"`
	// learner only
	GroupName string  `json:"groupName,omitempty"`
	MyStatus  *string `json:"myStatus"`
}

type Submission struct {
	ID           string          `json:"id"`
	AssignmentID string          `json:"assignmentId"`
	LearnerID    string          `json:"learnerId"`
	Learner      string          `json:"learner,omitempty"`
	Status       string          `json:"status"`
	Answers      json.RawMessage `json:"answers"`
	Artifacts    json.RawMessage `json:"artifacts"`
	Steps        json.RawMessage `json:"steps"`
	Scores       json.RawMessage `json:"scores"`
	SubmittedAt  *time.Time      `json:"submittedAt"`
	UpdatedAt    time.Time       `json:"updatedAt"`
}

type Learner struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Fact is a submission with its context and timings: the raw row the metrics are derived from.
type Fact struct {
	SubmissionID, AssignmentID, LearnerID, Learner, GroupID, Group, Title, Status string
	Experience                                                                    string
	OpenedAt, SubmittedAt                                                         *time.Time
	Answers, Document, Steps, Composition                                         json.RawMessage
	UpdatedAt                                                                     time.Time
}

// ---- learning profile ----

// Profile is a snapshot of how content reaches someone, not a label.
// Declared comes from the onboarding; the observed side is always recomputed from submissions.
type Profile struct {
	PersonID  string             `json:"personId"`
	Declared  map[string]float64 `json:"declared"`
	Answers   json.RawMessage    `json:"answers"`
	CreatedAt time.Time          `json:"createdAt"`
	UpdatedAt time.Time          `json:"updatedAt"`
}
