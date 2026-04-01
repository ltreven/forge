.PHONY: up down build logs shell setup

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

shell:
	docker compose exec agent /bin/bash

setup:
	cp -n .env.example .env || true
	@echo "Review .env before running the local MVP."
