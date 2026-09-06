package platform

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	Addr        string
	DatabaseURL string
	// BaseURL: where melu answers from, seen from outside. It exists for one reason: the Google
	// redirect has to be an absolute URL matching character for character the one registered in
	// the console, and the server cannot work out its own: behind a proxy the Host that arrives
	// is the proxy's, and it is picked by whoever makes the request anyway.
	// Whether cookies carry `Secure` comes from here too: https yes, http no.
	BaseURL            string
	GoogleClientID     string
	GoogleClientSecret string
	// TZ: where the school lives. Needed to know where the day starts, because truncating an
	// instant truncates in UTC and in Argentina that puts the boundary at 21:00.
	TZ string
}

// Load reads .env (if present) and then the environment. The environment wins.
func Load() Config {
	loadDotEnv()
	return Config{
		Addr:               env("MELU_ADDR", ":8787"),
		DatabaseURL:        env("MELU_DATABASE_URL", "postgres://melu:melu@localhost:5434/melu?sslmode=disable"),
		BaseURL:            env("MELU_BASE_URL", "http://localhost:8787"),
		GoogleClientID:     env("MELU_GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: env("MELU_GOOGLE_CLIENT_SECRET", ""),
		TZ:                 env("MELU_TZ", "America/Argentina/Buenos_Aires"),
	}
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

// loadDotEnv walks up looking for a .env. The server runs from packages/api (that is what the
// Makefile does) and the file lives at the root of the monorepo, next to the other one nobody
// wants to keep in sync.
func loadDotEnv() {
	path := ".env"
	for i := 0; i < 4; i++ {
		if _, err := os.Stat(path); err == nil {
			break
		}
		path = filepath.Join("..", path)
	}
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k, v, ok := strings.Cut(line, "=")
		if ok && os.Getenv(k) == "" {
			os.Setenv(strings.TrimSpace(k), strings.TrimSpace(v))
		}
	}
}
