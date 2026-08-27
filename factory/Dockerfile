FROM golang:1.22.12-bookworm@sha256:3d699e4d15d0f8f13c9195c0632a16702b8cbdece2955af1c23b37ae5d55a253 AS lint-builder
WORKDIR /src
COPY go/go.mod go/go.sum ./
RUN go mod download
COPY go/cmd ./cmd
COPY go/internal ./internal
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath -ldflags='-s -w' -o /out/lint-guide ./cmd/lint-guide

FROM debian:bookworm-slim@sha256:5ae3c39ebd15e229dcedd5cee596b2497182493d41ff162e824ba13fc1b2b867
ARG KIT_VERSION=0.1.98
ARG KIT_SHA256
RUN apt-get update \
 && apt-get install -y --no-install-recommends bash ca-certificates curl git jq ripgrep \
 && rm -rf /var/lib/apt/lists/*
RUN file=kit-v${KIT_VERSION}-x86_64-unknown-linux-gnu.tar.gz \
 && curl -fsSLo /tmp/kit.tgz "https://github.com/speakeasy-api/kit/releases/download/v${KIT_VERSION}/${file}" \
 && echo "${KIT_SHA256}  /tmp/kit.tgz" | sha256sum -c - \
 && tar -xzf /tmp/kit.tgz -C /usr/local/bin \
 && kit --version \
 && rm /tmp/kit.tgz
COPY --from=lint-builder /out/lint-guide /usr/local/bin/lint-guide
COPY factory/scripts/container-entrypoint.sh /usr/local/bin/factory-entrypoint
ENTRYPOINT ["/usr/local/bin/factory-entrypoint"]
