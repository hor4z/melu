package platform

import (
	"context"
	"embed"
	"fmt"
	"log/slog"
	"path"
	"sort"

	"github.com/jackc/pgx/v5/pgxpool"
)

func OpenDB(ctx context.Context, url string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, err
	}
	return pool, pool.Ping(ctx)
}

// Migrate applies, in order, the .sql files in fs that are not yet in schema_migrations.
func Migrate(ctx context.Context, pool *pgxpool.Pool, fs embed.FS, dir string) error {
	if _, err := pool.Exec(ctx, `create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`); err != nil {
		return err
	}
	entries, err := fs.ReadDir(dir)
	if err != nil {
		return err
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name() < entries[j].Name() })
	for _, e := range entries {
		var done bool
		if err := pool.QueryRow(ctx, `select exists(select 1 from schema_migrations where name=$1)`, e.Name()).Scan(&done); err != nil {
			return err
		}
		if done {
			continue
		}
		sql, err := fs.ReadFile(path.Join(dir, e.Name()))
		if err != nil {
			return err
		}
		tx, err := pool.Begin(ctx)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, string(sql)); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("migración %s: %w", e.Name(), err)
		}
		if _, err := tx.Exec(ctx, `insert into schema_migrations(name) values($1)`, e.Name()); err != nil {
			tx.Rollback(ctx)
			return err
		}
		if err := tx.Commit(ctx); err != nil {
			return err
		}
		slog.Info("migration applied", "name", e.Name())
	}
	return nil
}
