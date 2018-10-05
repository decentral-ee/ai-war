export NETWORK=local

build:
	npm run build

clean:
	rm -rf build

prepare:
	npm install

migrate-reset:
	npm run truffle -- migrate --reset
	npm run truffle -- exec truffle-scripts/extract-deployments.js

.PHONY: build clean prepare migrate-reset
