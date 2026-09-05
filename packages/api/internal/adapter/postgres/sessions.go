package postgres

import (
	"context"

	"melu/internal/domain"
)

type Sessions struct{ r *Repos }

func (r *Repos) Sessions() *Sessions { return &Sessions{r: r} }

func (s *Sessions) Create(ctx context.Context, personID string) (string, error) {
	return s.r.CreateSession(ctx, personID)
}
func (s *Sessions) Resolve(ctx context.Context, token string) (*domain.Person, error) {
	return s.r.Resolve(ctx, token)
}
func (s *Sessions) Delete(ctx context.Context, token string) error { return s.r.Delete(ctx, token) }

type Spaces struct{ r *Repos }

func (r *Repos) Spaces() *Spaces { return &Spaces{r: r} }
func (e *Spaces) Create(ctx context.Context, x domain.Space, creatorID string) (*domain.Space, error) {
	return e.r.CreateSpace(ctx, x, creatorID)
}
func (e *Spaces) OfPerson(ctx context.Context, id string) ([]domain.Space, error) {
	return e.r.OfPerson(ctx, id)
}
func (e *Spaces) Memberships(ctx context.Context, id string) ([]domain.Membership, error) {
	return e.r.membershipsOf(ctx, id)
}

type Groups struct{ r *Repos }

func (r *Repos) Groups() *Groups { return &Groups{r: r} }
func (g *Groups) Create(ctx context.Context, x domain.Group, guideID string) (*domain.Group, error) {
	return g.r.CreateGroup(ctx, x, guideID)
}
func (g *Groups) OfGuide(ctx context.Context, id, spaceID string) ([]domain.Group, error) {
	return g.r.OfGuide(ctx, id, spaceID)
}
func (g *Groups) ByID(ctx context.Context, id string) (*domain.Group, error) {
	return g.r.ByID(ctx, id)
}
