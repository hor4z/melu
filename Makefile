.PHONY: dev api web build db

db:        ## levanta postgres (docker)
	docker start melu-db 2>/dev/null || docker run -d --name melu-db -e POSTGRES_USER=melu -e POSTGRES_PASSWORD=melu -e POSTGRES_DB=melu -p 5434:5432 -v melu-pgdata:/var/lib/postgresql/data postgres:16-alpine

api:       ## backend con migraciones, en :8787
	cd packages/api && go run ./cmd/server

web:       ## front con hot reload, en :5173 (proxy /api → :8787)
	cd packages/web && npm run dev

build:     ## un solo binario con el front embebido
	cd packages/web && npm run build
	cd packages/api && go build -o ../../bin/melu ./cmd/server

dev:       ## api + web juntos
	$(MAKE) -j2 api web
