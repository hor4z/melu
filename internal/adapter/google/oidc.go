package google

import (
	"context"
	"errors"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

type Identidad struct{ Sub, Email, Nombre string }

type Cliente struct {
	cfg      oauth2.Config
	verifier *oidc.IDTokenVerifier
}

// Nuevo devuelve nil si no hay client id: el login con Google queda apagado.
func Nuevo(ctx context.Context, clientID, secret, redirectURL string) (*Cliente, error) {
	if clientID == "" {
		return nil, nil
	}
	p, err := oidc.NewProvider(ctx, "https://accounts.google.com")
	if err != nil {
		return nil, err
	}
	return &Cliente{
		cfg: oauth2.Config{
			ClientID: clientID, ClientSecret: secret, RedirectURL: redirectURL,
			Endpoint: p.Endpoint(), Scopes: []string{oidc.ScopeOpenID, "email", "profile"},
		},
		verifier: p.Verifier(&oidc.Config{ClientID: clientID}),
	}, nil
}

func (c *Cliente) URL(state string) string { return c.cfg.AuthCodeURL(state) }

func (c *Cliente) Canjear(ctx context.Context, code string) (*Identidad, error) {
	tok, err := c.cfg.Exchange(ctx, code)
	if err != nil {
		return nil, err
	}
	raw, ok := tok.Extra("id_token").(string)
	if !ok {
		return nil, errors.New("sin id_token")
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
		return nil, errors.New("email no verificado")
	}
	return &Identidad{Sub: idt.Subject, Email: claims.Email, Nombre: claims.Name}, nil
}
