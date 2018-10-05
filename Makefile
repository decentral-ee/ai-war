build:
	make -C core build
	make -C client build

clean:
	make -C core clean
	make -C client clean

.PHONY: build clean test

test:
	make -C core test
	make -C client test

prepare:
	npm install
	(cd react-scripts; npm install)
	make -C core prepare
	make -C client prepare

reset:
	rm -rf node_modules
	(cd react-scripts; rm -rf node_modules/)
	make -C core reset
	make -C client reset

.PHONY: prepare reset
