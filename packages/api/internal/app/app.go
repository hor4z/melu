// Package app orchestrates the domain through the ports. It knows nothing about HTTP or SQL.
package app

import (
	"context"
	"crypto/rand"
	"errors"
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

// UpdateMe saves what a person can change about themselves: how they are called and what their
// avatar is. Everything else on the row is identity (the email, the Google sub) or history.
//
// The three name fields are three questions, not one split in three: the surname is for the
// guide with two Sofías in the same group, and the nickname is for the person who wants to be
// called what everybody calls them. `Name` is written here from those, never received.
func (s *Services) UpdateMe(ctx context.Context, p domain.Person, in domain.Person) (*domain.Person, error) {
	first, last := strings.TrimSpace(in.FirstName), strings.TrimSpace(in.LastName)
	nick := strings.TrimSpace(in.Nickname)
	for _, f := range []string{first, last, nick} {
		if len([]rune(f)) > 60 {
			return nil, domain.ErrInvalid
		}
	}
	name := domain.DisplayName(first, last, nick)
	if name == "" {
		return nil, domain.ErrInvalid
	}

	// The style is validated against the domain list instead of trusted: it lands in a check
	// constraint in SQL, so an unknown value would come back as a database error and read to the
	// person as "no se pudo guardar" when the real answer is that the figure does not exist.
	style := strings.TrimSpace(in.AvatarStyle)
	if style != "" && !domain.IsAvatarStyle(style) {
		return nil, domain.ErrInvalid
	}
	seed := strings.TrimSpace(in.AvatarSeed)
	opts := in.AvatarOptions
	// No style means the photo wins, and then the seed and the parts are leftovers of a figure
	// nobody is looking at: they would come back the day the person switches and surprise them
	// with an old face.
	if style == "" {
		seed, opts = "", nil
	}
	if len([]rune(seed)) > 40 {
		return nil, domain.ErrInvalid
	}
	if err := checkAvatarOptions(opts); err != nil {
		return nil, err
	}

	p.Name, p.FirstName, p.LastName, p.Nickname = name, first, last, nick
	p.AvatarStyle, p.AvatarSeed, p.AvatarOptions = style, seed, opts
	if err := s.People.SaveProfile(ctx, p.ID, p); err != nil {
		return nil, err
	}
	_ = s.Events.Emit(ctx, domain.Event{PersonID: &p.ID, Verb: "person.updated", Source: "declared", OccurredAt: time.Now()})
	return &p, nil
}

// checkAvatarOptions validates the shape of the picked parts and not which parts exist. Which
// ones exist is the drawing library's business, it changes when the library is updated, and an
// unknown value there is drawn as the default: copying that list into Go would mean a release of
// the backend every time somebody adds a haircut.
//
// The shape is worth checking, though, and for a reason with a name: the parts end up inside an
// SVG. Letters and digits only means no quote, no angle bracket and no backslash can reach the
// generator, which is the exact hole the DiceBear advisory of the `rotate` option was about.
func checkAvatarOptions(o map[string]string) error {
	if len(o) > 14 {
		return domain.ErrInvalid
	}
	for k, v := range o {
		if !alnum(k, 24) || !alnum(v, 32) {
			return domain.ErrInvalid
		}
	}
	return nil
}

func alnum(s string, max int) bool {
	if s == "" || len(s) > max {
		return false
	}
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
		default:
			return false
		}
	}
	return true
}

// SignInWithIdentity resolves or creates the person behind a Google account and opens a session.
//
// The second lookup (by email, when the sub is unknown) is what makes the whole thing work
// without codes: a guide writes down the emails of their group, and when one of those people
// signs in for the first time the membership is already waiting. That first sign-in is also
// what fills in their real name and their picture.
func (s *Services) SignInWithIdentity(ctx context.Context, sub, email, name, avatar string) (token string, err error) {
	email = strings.ToLower(strings.TrimSpace(email))
	p, err := s.People.ByGoogleSub(ctx, sub)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return "", err
	}
	if p == nil && email != "" {
		p, err = s.People.ByEmail(ctx, email)
		if err != nil && !errors.Is(err, domain.ErrNotFound) {
			return "", err
		}
		if p != nil {
			if err := s.People.LinkGoogle(ctx, p.ID, sub, name, avatar); err != nil {
				return "", err
			}
		}
	}
	if p == nil {
		if name == "" {
			name = strings.Split(email, "@")[0]
		}
		first, last := domain.SplitName(name)
		p, err = s.People.Create(ctx, domain.Person{Email: email, GoogleSub: sub, Name: name, FirstName: first, LastName: last, AvatarURL: avatar})
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
	e, err := s.Spaces.Create(ctx, domain.Space{Name: name, Slug: slug(name) + "-" + suffix(4), Kind: kind}, p.ID)
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
	g, err := s.Groups.Create(ctx, domain.Group{SpaceID: spaceID, Name: name}, p.ID)
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

// suffix keeps two spaces with the same name apart in the URL. Nobody types it: it used to
// also make the group codes, and that is the part that is gone.
func suffix(n int) string {
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
