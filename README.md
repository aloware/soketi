# soketi (Aloware fork)

A Pusher-compatible WebSockets server, built on [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js).

This is Aloware's maintained fork of [soketi/soketi](https://github.com/soketi/soketi), created by Alex Renoki. The last upstream release is 1.6.1 from March 2024. Aloware maintains this fork for its own deployment and publishes it under the same AGPL-3.0 license.

![CI](https://github.com/aloware/soketi/actions/workflows/ci.yml/badge.svg?branch=main)

## What differs from upstream

- Runs on Node 22 and 24 with uWebSockets.js 20.54.0.
- A webhook job whose app cannot be resolved is dropped with a warning. It no longer crashes the server.
- An unhandled promise rejection is logged. It no longer stops the server.
- `stop()` is idempotent. Repeated stop calls share one shutdown.
- Releases are published to GitHub Releases and GitHub Packages, and images to `ghcr.io/aloware/soketi`.

The wire protocol, the HTTP API, the configuration file format, and the environment variables are unchanged from upstream 1.6.1. The [upstream documentation](https://docs.soketi.app) still applies to them.

## Install

Install a release from its tarball. No registry authentication is needed.

```shell
npm install -g https://github.com/aloware/soketi/releases/download/<tag>/aloware-soketi-<version>.tgz
```

Or run a container image:

```shell
docker run -p 6001:6001 ghcr.io/aloware/soketi:latest
```

The `distroless` variant is available as `ghcr.io/aloware/soketi:latest-distroless`.

## Run

```shell
soketi start --config=/etc/soketi/soketi.conf
```

The server listens on port 6001. `GET /` answers the health check. `GET /ready` answers 500 while the server is shutting down. If you want a closing instance drained, point the load balancer health check at `/ready`.

## Branches and releases

- `main` is the maintained branch and the default branch.
- Every pull request runs the test matrix on Node 24, plus a smoke job on Node 22.
- A tag `v<version>` creates a GitHub Release with the npm tarball, publishes `@aloware/soketi` to GitHub Packages, and pushes the `debian` and `distroless` images.

## Develop

Requirements: Node 22 or 24. The `uWebSockets.js` binary needs glibc 2.34 or newer, so Alpine images are not supported.

```shell
npm ci --ignore-scripts
npm run build
npm run lint
npm test
```

The Redis, NATS, MySQL, PostgreSQL, DynamoDB, and SQS suites need those services. See `.github/workflows/ci.yml` for how CI starts each one, and `docker-compose.yml` for LocalStack and DynamoDB Local.

## Security

Report a vulnerability to Aloware privately. Do not open a public issue.

## License

AGPL-3.0. See [LICENSE](LICENSE). Copyright for the original work remains with its authors.
