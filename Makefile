# Whole-stack tasks via Docker Compose. Run `make up` and open localhost:5173.
# (Native dev without Docker lives in backend/Makefile + `npm run dev`.)

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

.PHONY: up
up: ## Build (if needed) and start the stack in the foreground
	docker compose up --build

.PHONY: up-d
up-d: ## Start the stack in the background
	docker compose up --build -d

.PHONY: down
down: ## Stop and remove the containers
	docker compose down

.PHONY: logs
logs: ## Follow logs from all services
	docker compose logs -f

.PHONY: ps
ps: ## Show container status
	docker compose ps

.PHONY: reseed
reseed: ## Reset the SQLite DB to the mockup data (deletes db.sqlite3, reseeds)
	rm -f backend/db.sqlite3 backend/db.sqlite3-journal
	docker compose restart backend
