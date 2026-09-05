package platform

import (
	"bufio"
	"os"
	"strings"
)

type Config struct {
	Addr               string
	DatabaseURL        string
	BaseURL            string
	GoogleClientID     string
	GoogleClientSecret string
	DevLogin           bool
	// Zona: dónde vive la escuela. Hace falta para saber dónde empieza el día, porque
	// truncar un instante trunca en UTC y en Argentina eso pone el borde a las 21:00.
	Zona string
}

// Load lee .env (si existe) y luego el entorno. El entorno gana.
func Load() Config {
	loadDotEnv(".env")
	return Config{
		Addr:               env("MELU_ADDR", ":8787"),
		DatabaseURL:        env("MELU_DATABASE_URL", "postgres://melu:melu@localhost:5434/melu?sslmode=disable"),
		BaseURL:            env("MELU_BASE_URL", "http://localhost:8787"),
		GoogleClientID:     env("MELU_GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: env("MELU_GOOGLE_CLIENT_SECRET", ""),
		DevLogin:           env("MELU_DEV_LOGIN", "") == "1",
		Zona:               env("MELU_TZ", "America/Argentina/Buenos_Aires"),
	}
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func loadDotEnv(path string) {
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
