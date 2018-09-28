build:
	(cd core; npm run build)
	(cd client; npm run build)

prepare:
	(cd core; npm install)
	(cd client; npm install)
	ln -sf ../../core/build/contracts client/src/contracts

.PHONY: build prepare
