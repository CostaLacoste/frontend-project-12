build:
	npm --prefix frontend run build

start:
	npx --no-install start-server -s ./frontend/dist
