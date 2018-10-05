build:
	make -C core build
	make -C client build
	cp -f _headers client/build/

clean:
	(cd react-scripts; rm -rf node_modules/)
	make -C core clean
	make -C client clean

prepare:
	(cd react-scripts; npm install)
	make -C core prepare
	make -C client prepare

.PHONY: build clean prepare
