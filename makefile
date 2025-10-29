.PHONY: partition classify

partition:
	go run ./cmd/partition

classify:
	uv run cmd/classify/main.py
