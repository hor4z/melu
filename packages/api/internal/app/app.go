// Package app orchestrates the domain through the ports. It knows nothing about HTTP or SQL.
package app

import (
	"context"
	"crypto/rand"
	"strings"
	"time"

	"melu/internal/domain"
	"melu/internal/port"
)

type Services struct {
	People      port.People
	Sessions    port.Sessions
	Spaces      port.Spaces
	Groups      port.Groups
	Lenses      port.Lenses
	Events      port.Events
	Activities  port.Activities
	Assignments port.Assignments
	Submissions port.Submissions
	Memberships port.Memberships
	Dashboard   port.Dashboard
	Profiles    port.Profiles
	// TZ: if nil, the process time zone is used.
	TZ *time.Location
}

func (s *Services) zone() *time.Location {
	if s.TZ != nil {
		return s.TZ
	}
	return time.Local
}

// startOfDay returns the start of the local day. It exists because `Truncate(24*time.Hour)`
// truncates in UTC: in Argentina the "day" started at 21:00 and the dashboard bars came out shifted.
func startOfDay(t time.Time, z *time.Location) time.Time {
	t = t.In(z)
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, z)
}

// SignInWithIdentity resolves or creates the person from an external identity and opens a session.
func (s *Services) SignInWithIdentity(ctx context.Context, sub, email, name string) (token string, err error) {
	p, err := s.People.ByGoogleSub(ctx, sub)
	if err != nil && err != domain.ErrNotFound {
		return "", err
	}
	if p == nil && email != "" {
		p, err = s.People.ByEmail(ctx, email)
		if err != nil && err != domain.ErrNotFound {
			return "", err
		}
		if p != nil {
			if err := s.People.LinkGoogle(ctx, p.ID, sub); err != nil {
				return "", err
			}
		}
	}
	if p == nil {
		if name == "" {
			name = strings.Split(email, "@")[0]
		}
		p, err = s.People.Create(ctx, domain.Person{Email: email, GoogleSub: sub, Name: name})
		if err != nil {
			return "", err
		}
		_ = s.Events.Emit(ctx, domain.Event{PersonID: &p.ID, Verb: "person.created", Source: "observed", OccurredAt: time.Now()})
	}
	_ = s.Events.Emit(ctx, domain.Event{PersonID: &p.ID, Verb: "session.started", Source: "observed", OccurredAt: time.Now()})
	return s.Sessions.Create(ctx, p.ID)
}

type Account struct {
	Person      domain.Person       `json:"person"`
	Spaces      []domain.Space      `json:"spaces"`
	Memberships []domain.Membership `json:"memberships"`
}

func (s *Services) Account(ctx context.Context, p domain.Person) (*Account, error) {
	spaces, err := s.Spaces.OfPerson(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	memberships, err := s.Spaces.Memberships(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	return &Account{Person: p, Spaces: spaces, Memberships: memberships}, nil
}

func (s *Services) CreateSpace(ctx context.Context, p domain.Person, name, kind string) (*domain.Space, error) {
	if err := domain.ValidateName(name); err != nil {
		return nil, err
	}
	if kind == "" {
		kind = "personal"
	}
	e, err := s.Spaces.Create(ctx, domain.Space{Name: name, Slug: slug(name) + "-" + code(4), Kind: kind}, p.ID)
	if err != nil {
		return nil, err
	}
	_ = s.Events.Emit(ctx, domain.Event{PersonID: &p.ID, Verb: "space.created", Payload: map[string]any{"spaceId": e.ID}, Source: "observed", OccurredAt: time.Now()})
	return e, nil
}

func (s *Services) CreateGroup(ctx context.Context, p domain.Person, spaceID, name string) (*domain.Group, error) {
	if err := domain.ValidateName(name); err != nil {
		return nil, err
	}
	if !s.isMember(ctx, p.ID, spaceID, domain.RoleCoordinator, domain.RoleGuide) {
		return nil, domain.ErrNotAllowed
	}
	g, err := s.Groups.Create(ctx, domain.Group{SpaceID: spaceID, Name: name, Code: code(6)}, p.ID)
	if err != nil {
		return nil, err
	}
	_ = s.Events.Emit(ctx, domain.Event{PersonID: &p.ID, GroupID: &g.ID, Verb: "group.created", Source: "observed", OccurredAt: time.Now()})
	return g, nil
}

func (s *Services) isMember(ctx context.Context, personID, spaceID string, roles ...domain.Role) bool {
	memberships, err := s.Spaces.Memberships(ctx, personID)
	if err != nil {
		return false
	}
	for _, m := range memberships {
		if m.SpaceID != spaceID {
			continue
		}
		for _, r := range roles {
			if m.Role == r {
				return true
			}
		}
	}
	return false
}

// code generates a readable code with no ambiguous characters (0/O, 1/I/L).
func code(n int) string {
	const alf = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
	b := make([]byte, n)
	rand.Read(b)
	for i := range b {
		b[i] = alf[int(b[i])%len(alf)]
	}
	return string(b)
}

func slug(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == ' ' || r == '-' || r == '_':
			b.WriteByte('-')
		}
	}
	return strings.Trim(b.String(), "-")
}
