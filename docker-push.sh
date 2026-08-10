#!/usr/bin/env bash
#
# Helper script for building, tagging, and pushing the HafSQL docker image.
#
# Builds the image from the local Dockerfile (with git metadata baked into
# the image labels), tags it as
#
#   mahdiyari/hafsql:<version from deno.json>
#   mahdiyari/hafsql:latest
#
# and pushes both tags to Docker Hub.
#
# Prerequisite: `docker login` with an account that can push to the repo.
#
set -euo pipefail

IMAGE="mahdiyari/hafsql"
VERSION=""
PUSH=1
LATEST=1
DRY_RUN=0
EXTRA_BUILD_ARGS=()

usage() {
	cat <<'EOF'
Usage: ./docker-push.sh [options]

Build, tag, and push the HafSQL docker image to Docker Hub.

Options:
  -v, --version <ver>   Version tag (default: "version" field of deno.json)
  -i, --image <name>    Image repository (default: mahdiyari/hafsql)
  -n, --no-push         Build and tag only; skip pushing
  -l, --no-latest       Skip the "latest" tag
  -c, --no-cache        Pass --no-cache to docker build
  -d, --dry-run         Print the docker commands instead of executing them
  -h, --help            Show this help

Examples:
  ./docker-push.sh                      # build + push <version> and latest
  ./docker-push.sh --no-push            # build and tag only
  ./docker-push.sh -v 2.5.1 --no-latest # push only a specific version tag
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	-v | --version)
		[[ $# -ge 2 ]] || { echo "error: $1 requires a value" >&2; exit 1; }
		VERSION="$2"
		shift 2
		;;
	-i | --image)
		[[ $# -ge 2 ]] || { echo "error: $1 requires a value" >&2; exit 1; }
		IMAGE="$2"
		shift 2
		;;
	-n | --no-push)
		PUSH=0
		shift
		;;
	-l | --no-latest)
		LATEST=0
		shift
		;;
	-c | --no-cache)
		EXTRA_BUILD_ARGS+=(--no-cache)
		shift
		;;
	-d | --dry-run)
		DRY_RUN=1
		shift
		;;
	-h | --help)
		usage
		exit 0
		;;
	*)
		echo "error: unknown option: $1" >&2
		usage >&2
		exit 1
		;;
	esac
done

# Always run from the repository root, where the Dockerfile lives.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

run() {
	if [[ "$DRY_RUN" == 1 ]]; then
		printf '%q ' "$@"
		printf '\n'
	else
		"$@"
	fi
}

is_logged_in() {
	if docker system info 2>/dev/null | grep -q '^ *Username:'; then
		return 0
	fi
	local cfg="${DOCKER_CONFIG:-$HOME/.docker}/config.json"
	if [[ -f "$cfg" ]] &&
		grep -qE '"(docker\.io|index\.docker\.io|https://index\.docker\.io/v1/?)"' "$cfg"; then
		return 0
	fi
	return 1
}

# --- Preflight checks --------------------------------------------------------

if ! command -v docker >/dev/null 2>&1; then
	echo "error: docker CLI not found in PATH" >&2
	exit 1
fi

if [[ ! -f Dockerfile ]]; then
	echo "error: Dockerfile not found in $SCRIPT_DIR" >&2
	exit 1
fi

if [[ -z "$VERSION" ]]; then
	VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' deno.json | head -n 1)"
fi
if [[ -z "$VERSION" ]]; then
	echo "error: could not determine image version; set \"version\" in deno.json or pass --version" >&2
	exit 1
fi

# --- Git metadata (baked into the image labels) ------------------------------

BUILD_TIME="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
GIT_COMMIT_SHA="$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
GIT_CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || true)"
if [[ -z "$GIT_CURRENT_BRANCH" ]]; then
	GIT_CURRENT_BRANCH="$(git describe --tags --exact-match HEAD 2>/dev/null || echo '[unknown]')"
fi
GIT_LAST_LOG_MESSAGE="$(git log -1 --pretty=%B 2>/dev/null || echo 'unknown')"
GIT_LAST_COMMITTER="$(git log -1 --format='%an <%ae>' 2>/dev/null || echo 'unknown')"
GIT_LAST_COMMIT_DATE="$(git log -1 --format=%aI 2>/dev/null || echo 'unknown')"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
	if ! git diff --quiet || ! git diff --cached --quiet; then
		echo "warning: working tree has uncommitted changes; image may not match HEAD" >&2
	fi
fi

# --- Build -------------------------------------------------------------------

echo "==> Building $IMAGE:$VERSION"
run docker build \
	${EXTRA_BUILD_ARGS[@]+"${EXTRA_BUILD_ARGS[@]}"} \
	--build-arg BUILD_TIME="$BUILD_TIME" \
	--build-arg GIT_COMMIT_SHA="$GIT_COMMIT_SHA" \
	--build-arg GIT_CURRENT_BRANCH="$GIT_CURRENT_BRANCH" \
	--build-arg GIT_LAST_LOG_MESSAGE="$GIT_LAST_LOG_MESSAGE" \
	--build-arg GIT_LAST_COMMITTER="$GIT_LAST_COMMITTER" \
	--build-arg GIT_LAST_COMMIT_DATE="$GIT_LAST_COMMIT_DATE" \
	-t "$IMAGE:$VERSION" \
	.

# --- Tag ---------------------------------------------------------------------

if [[ "$LATEST" == 1 ]]; then
	echo "==> Tagging $IMAGE:$VERSION as $IMAGE:latest"
	run docker tag "$IMAGE:$VERSION" "$IMAGE:latest"
fi

# --- Push --------------------------------------------------------------------

if [[ "$PUSH" == 1 ]]; then
	if [[ "$DRY_RUN" == 0 ]] && ! is_logged_in; then
		echo "error: not logged in to Docker Hub; run 'docker login' first" >&2
		exit 1
	fi
	echo "==> Pushing $IMAGE:$VERSION"
	run docker push "$IMAGE:$VERSION"
	if [[ "$LATEST" == 1 ]]; then
		echo "==> Pushing $IMAGE:latest"
		run docker push "$IMAGE:latest"
	fi
fi

# --- Summary -----------------------------------------------------------------

STATUS="built"
if [[ "$PUSH" == 1 ]]; then
	STATUS="built and pushed"
fi
if [[ "$DRY_RUN" == 1 ]]; then
	STATUS="dry-run (nothing was executed)"
fi
echo "==> Done: $IMAGE:$VERSION $STATUS"
if [[ "$LATEST" == 1 ]]; then
	echo "          $IMAGE:latest $STATUS"
fi
