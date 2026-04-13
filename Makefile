install:
	npm install
	npm --prefix frontend install

build:
	npm --prefix frontend run build

start:
	./node_modules/.bin/start-server -s ./frontend/dist
