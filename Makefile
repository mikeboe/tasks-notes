.PHONY: migrations-apply migrations-create run build-api build-client run-client run-api

migrations-apply:
	cd apps/api && npx drizzle-kit migrate

migrations-create:
	cd apps/api && npx drizzle-kit generate

run-api:
	cd apps/api && npm run dev

run-client:
	cd apps/client && npm run dev

build-api:
	cd apps/api && npm run build

build-client:
	cd apps/client && npm run build
