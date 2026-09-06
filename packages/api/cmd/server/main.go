package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"melu/internal/adapter/google"
	httpadapter "melu/internal/adapter/http"
	"melu/internal/adapter/postgres"
	"melu/internal/app"
	"melu/internal/platform"
	"melu/internal/web"
	"melu/migrations"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, nil)))
	ctx := context.Background()
	cfg := platform.Load()

	db, err := platform.OpenDB(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("no database", "err", err)
		os.Exit(1)
	}
	if err := platform.Migrate(ctx, db, migrations.FS, "."); err != nil {
		slog.Error("migrations", "err", err)
		os.Exit(1)
	}

	if os.Getenv("MELU_DEMO") == "1" {
		if err := platform.Migrate(ctx, db, migrations.Demo, "demo"); err != nil {
			slog.Error("demo", "err", err)
			os.Exit(1)
		}
	}

	zone, err := time.LoadLocation(cfg.TZ)
	if err != nil {
		slog.Warn("unknown time zone, falling back to the process one", "zone", cfg.TZ, "err", err)
		zone = time.Local
	}

	repos := postgres.New(db)
	svc := &app.Services{
		People: repos, Sessions: repos.Sessions(), Spaces: repos.Spaces(),
		Groups: repos.Groups(), Lenses: repos, Events: repos,
		Activities: repos.Activities(), Assignments: repos.Assignments(), Submissions: repos.Submissions(), Memberships: repos.Memberships(), Dashboard: repos.Dashboard(), TZ: zone,
	}

	// Google is the only way in, so a server that cannot reach it is a server nobody can use.
	// Better to say so here than to hand out a login screen whose button leads to a 503.
	g, err := google.New(ctx, cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.BaseURL+"/api/auth/google/callback")
	if err != nil {
		slog.Error("Google sign-in could not be set up, and it is the only way into melu", "err", err)
		os.Exit(1)
	}

	srv := httpadapter.New(svc, g, web.Dist(), cfg.BaseURL)
	slog.Info("melu listening", "addr", cfg.Addr)
	if err := http.ListenAndServe(cfg.Addr, srv.Handler()); err != nil {
		slog.Error("server", "err", err)
		os.Exit(1)
	}
}
