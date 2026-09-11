ARG VERSION=24

FROM --platform=$BUILDPLATFORM node:$VERSION-bookworm AS build

COPY . /tmp/build

WORKDIR /tmp/build

RUN apt-get update -y ; \
    apt-get install -y --no-install-recommends git ; \
    npm ci --ignore-scripts ; \
    npm run build ; \
    npm ci --omit=dev --ignore-scripts ; \
    rm -rf node_modules/*/test/ node_modules/*/tests/ ; \
    mkdir -p /app ; \
    cp -r bin/ dist/ node_modules/ LICENSE package.json package-lock.json README.md /app/

FROM --platform=$TARGETPLATFORM node:$VERSION-bookworm-slim

LABEL org.opencontainers.image.source="https://github.com/aloware/soketi"
LABEL org.opencontainers.image.vendor="Aloware"
LABEL org.opencontainers.image.licenses="AGPL-3.0"

COPY --from=build /app /app

WORKDIR /app

EXPOSE 6001

ENTRYPOINT ["node", "/app/bin/server.js", "start"]
