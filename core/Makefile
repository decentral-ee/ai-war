export NETWORK=local

build:
	npm run build

clean:
	rm -rf build

test:
	npm test

.PHONY: build clean test

migrate-reset:
	npm run truffle -- migrate --reset
	npm run truffle -- exec truffle-scripts/extract-deployments.js

.PHONY: migrate-reset

prepare:
	npm install

reset:
	rm -rf node_modules

.PHONY: prepare reset
