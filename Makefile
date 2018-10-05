build:
	make -C core build
	make -C client build

clean:
	(cd react-scripts; rm -rf node_modules/)
	make -C core clean
	make -C client clean

test:
	make -C core test
	make -C client test

prepare:
	(cd react-scripts; npm install)
	make -C core prepare
	make -C client prepare

.PHONY: build clean test prepare
