default: build

# Default target to build the image
build:
	docker build -t steffenmllr/mqtt-vpn-status .

remove:
	-docker rm -f vpn-status

run:
	docker run --name=vpn-status --restart=always -d steffenmllr/mqtt-vpn-status

shell:
	docker run --name=vpn-status --restart=always -i steffenmllr/mqtt-vpn-status

