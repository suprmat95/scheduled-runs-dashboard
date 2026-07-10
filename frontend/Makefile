# Frontend tasks. Wraps npm and activates the right Node (20, from .nvmrc) via
# nvm when available — so you don't have to remember `nvm use` first.
# (The whole stack via Docker lives in the root Makefile.)

# Source nvm if it's installed and switch to the .nvmrc Node; otherwise fall
# back to whatever `node` is on PATH. nvm is a shell function, so it must be
# sourced inside each recipe's shell.
NVM_SH = $${NVM_DIR:-$$HOME/.nvm}/nvm.sh
USE_NODE = if [ -s "$(NVM_SH)" ]; then . "$(NVM_SH)"; nvm use >/dev/null 2>&1 || nvm use 20 >/dev/null 2>&1; fi

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

.PHONY: install
install: ## Install dependencies
	@$(USE_NODE); node --version; npm install

.PHONY: dev
dev: ## Start the Vite dev server (http://localhost:5173)
	@$(USE_NODE); npm run dev

.PHONY: build
build: ## Type-check and build for production
	@$(USE_NODE); npm run build

.PHONY: preview
preview: ## Preview the production build
	@$(USE_NODE); npm run preview

.PHONY: test
test: ## Run the test suite (Vitest)
	@$(USE_NODE); npm test

.PHONY: lint
lint: ## Lint the source
	@$(USE_NODE); npm run lint
