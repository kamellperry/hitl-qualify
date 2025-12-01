.PHONY: partition classify

partition:
	go run ./cmd/partition

classify:
	go run ./cmd/classify