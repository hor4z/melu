package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"

	"melu/internal/adapter/google"
	httpadapter "melu/internal/adapter/http"
	"melu/internal/adapter/postgres"
	"melu/internal/app"
	"melu/internal/platform"
	"melu/migrations"
	"melu/web"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, nil)))
	ctx := context.Background()
	cfg := platform.Load()

	db, err := platform.OpenDB(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("sin base de datos", "err", err)
		os.Exit(1)
	}
	if err := platform.Migrate(ctx, db, migrations.FS, "."); err != nil {
		slog.Error("migraciones", "err", err)
		os.Exit(1)
	}

	repos := postgres.New(db)
	svc := &app.Servicios{
		Personas: repos, Sesiones: repos.Sesiones(), Espacios: repos.Espacios(),
		Grupos: repos.Grupos(), Lentes: repos, Eventos: repos,
		Actividades: repos.Actividades(), Asignaciones: repos.Asignaciones(), Entregas: repos.Entregas(), Membresias: repos.Membresias(),
	}

	g, err := google.Nuevo(ctx, cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.BaseURL+"/api/auth/google/callback")
	if err != nil {
		slog.Error("google oidc", "err", err)
		os.Exit(1)
	}
	if g == nil {
		slog.Warn("login con Google apagado (falta MELU_GOOGLE_CLIENT_ID)")
	}
	if cfg.DevLogin {
		slog.Warn("login de desarrollo activo (MELU_DEV_LOGIN=1)")
	}

	srv := httpadapter.New(svc, g, cfg.DevLogin, web.Dist())
	slog.Info("melu escuchando", "addr", cfg.Addr)
	if err := http.ListenAndServe(cfg.Addr, srv.Handler()); err != nil {
		slog.Error("server", "err", err)
		os.Exit(1)
	}
}
