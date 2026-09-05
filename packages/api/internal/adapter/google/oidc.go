package google

import (
	"context"
	"errors"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

type Identity struct{ Sub, Email, Name string }

type Client struct {
	cfg      oauth2.Config
	verifier *oidc.IDTokenVerifier
}

// New returns nil when there is no client id: Google sign-in stays off.
func New(ctx context.Context, clientID, secret, redirectURL string) (*Client, error) {
	if clientID == "" {
		return nil, nil
	}
	p, err := oidc.NewProvider(ctx, "https://accounts.google.com")
	if err != nil {
		return nil, err
	}
	return &Client{
		cfg: oauth2.Config{
			ClientID: clientID, ClientSecret: secret, RedirectURL: redirectURL,
			Endpoint: p.Endpoint(), Scopes: []string{oidc.ScopeOpenID, "email", "profile"},
		},
		verifier: p.Verifier(&oidc.Config{ClientID: clientID}),
	}, nil
}

func (c *Client) URL(state string) string { return c.cfg.AuthCodeURL(state) }

func (c *Client) Exchange(ctx context.Context, code string) (*Identity, error) {
	tok, err := c.cfg.Exchange(ctx, code)
	if err != nil {
		return nil, err
	}
	raw, ok := tok.Extra("id_token").(string)
	if !ok {
		return nil, errors.New("no id_token")
	}
	idt, err := c.verifier.Verify(ctx, raw)
	if err != nil {
		return nil, err
	}
	var claims struct {
		Email    string `json:"email"`
		Verified bool   `json:"email_verified"`
		Name     string `json:"name"`
	}
	if err := idt.Claims(&claims); err != nil {
		return nil, err
	}
	if !claims.Verified {
		return nil, errors.New("email not verified")
	}
	return &Identity{Sub: idt.Subject, Email: claims.Email, Name: claims.Name}, nil
}
