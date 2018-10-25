export NETWORK=local

build:
	npm run build

clean:
	rm -rf build

test:
	npm test

.PHONY: build clean test

migrate-reset: extract-deployments
	npm run truffle -- migrate --reset

extract-deployments:
	npm run truffle -- exec truffle-scripts/extract-deployments.js $(PWD)/sdk/deployments.${NETWORK}.json

.PHONY: migrate-reset extract-deployments

prepare:
	npm install

reset:
	rm -rf node_modules

.PHONY: prepare reset
