build:
	(cd core; npm run build)
	(cd client; npm run build)

prepare:
	(cd core; npm install)
	(cd client; npm install)

.PHONY: build prepare
