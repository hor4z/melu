package google

import (
	"context"
	"errors"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

// Identity is everything melu takes from Google. The picture is a URL Google hosts; it is
// stored as a plain avatar URL so it can later point somewhere else without touching the model.
type Identity struct{ Sub, Email, Name, Picture string }

type Client struct {
	cfg      oauth2.Config
	verifier *oidc.IDTokenVerifier
}

// New builds the client. An empty client id is a configuration error, not a way to turn Google
// off: there is no other way into melu, so a server without it could not sign anybody in.
func New(ctx context.Context, clientID, secret, redirectURL string) (*Client, error) {
	if clientID == "" {
		return nil, errors.New("MELU_GOOGLE_CLIENT_ID is empty")
	}
	if secret == "" {
		return nil, errors.New("MELU_GOOGLE_CLIENT_SECRET is empty")
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

// URL is where the browser goes to sign in.
//
// `select_account` matters more than it looks: without it, anybody already signed in to Google
// comes straight back as the same person, so there is no way to try melu as a guide and as a
// learner from one browser.
func (c *Client) URL(state, nonce string) string {
	return c.cfg.AuthCodeURL(state, oidc.Nonce(nonce), oauth2.SetAuthURLParam("prompt", "select_account"))
}

// Exchange turns the code Google sent back into an identity. Everything comes from the claims
// of the id_token, whose signature, issuer, audience and expiry the verifier already checked.
func (c *Client) Exchange(ctx context.Context, code, nonce string) (*Identity, error) {
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
	// The nonce ties this token to the request that started the flow: an id_token captured
	// somewhere else cannot be replayed here, because it carries a different one.
	if idt.Nonce != nonce {
		return nil, errors.New("nonce mismatch")
	}
	var claims struct {
		Email    string `json:"email"`
		Verified bool   `json:"email_verified"`
		Name     string `json:"name"`
		Picture  string `json:"picture"`
	}
	if err := idt.Claims(&claims); err != nil {
		return nil, err
	}
	if !claims.Verified {
		return nil, errors.New("email not verified")
	}
	return &Identity{Sub: idt.Subject, Email: claims.Email, Name: claims.Name, Picture: claims.Picture}, nil
}
