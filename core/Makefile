export NETWORK=local

migrate-reset:
	npm run truffle -- migrate --reset
	npm run truffle -- exec truffle-scripts/extract-deployments.js

.PHONY: migrate-reset
