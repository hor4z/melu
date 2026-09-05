package migrations

import "embed"

//go:embed *.sql
var FS embed.FS

//go:embed demo/*.sql
var Demo embed.FS
