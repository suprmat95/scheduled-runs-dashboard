# Cargoful backend — common tasks.
# Usage: `make setup` once, then `make seed` and `make run`.

# Python used to create the virtualenv (Django 5 needs 3.10+).
PYTHON ?= python3.12
VENV   := .venv
BIN    := $(VENV)/bin
PY     := $(BIN)/python
PIP    := $(BIN)/pip

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

$(PY): ## Create the virtualenv if missing
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --quiet --upgrade pip

.PHONY: install
install: $(PY) ## Create venv (if needed) and install dependencies
	$(PIP) install --quiet -r requirements.txt

.PHONY: setup
setup: install migrate seed ## Full first-time setup: install + migrate + seed

.PHONY: migrate
migrate: ## Apply database migrations
	$(PY) manage.py migrate

.PHONY: makemigrations
makemigrations: ## Generate new migrations from model changes
	$(PY) manage.py makemigrations

.PHONY: seed
seed: ## Populate the database with mockup data
	$(PY) manage.py seed

.PHONY: run
run: ## Start the development server (http://127.0.0.1:8000)
	$(PY) manage.py runserver

.PHONY: shell
shell: ## Open the Django shell
	$(PY) manage.py shell

.PHONY: test
test: ## Run the test suite
	$(PY) manage.py test

.PHONY: reset-db
reset-db: ## Delete the SQLite DB, re-migrate and re-seed from scratch
	rm -f db.sqlite3 db.sqlite3-journal
	$(MAKE) migrate seed

.PHONY: clean
clean: ## Remove the virtualenv and Python caches
	rm -rf $(VENV)
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
