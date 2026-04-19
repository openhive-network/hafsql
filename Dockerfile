FROM denoland/deno:2.5.6

# The port that your application listens to.
EXPOSE 3000

WORKDIR /app

# Prefer not to run as root.
USER deno

# Cache the dependencies as a layer (the following two steps are re-run only when deps.ts is modified).
# Ideally cache deps.ts will download and compile _all_ external files used in main.ts.
COPY src/deps.ts src/deps.ts
COPY deno.json .
COPY deno.lock .
RUN deno install --entrypoint src/deps.ts

# These steps will be re-run upon each file change in your working directory:
COPY . .
# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno cache src/main.ts

ARG BUILD_TIME
ARG GIT_COMMIT_SHA
ARG GIT_CURRENT_BRANCH
ARG GIT_LAST_LOG_MESSAGE
ARG GIT_LAST_COMMITTER
ARG GIT_LAST_COMMIT_DATE
LABEL org.opencontainers.image.created="$BUILD_TIME"
LABEL org.opencontainers.image.url="https://hive.io/"
LABEL org.opencontainers.image.documentation="https://gitlab.syncad.com/hive/hafsql"
LABEL org.opencontainers.image.source="https://gitlab.syncad.com/hive/hafsql"
LABEL org.opencontainers.image.revision="$GIT_COMMIT_SHA"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.ref.name="HafSQL"
LABEL org.opencontainers.image.title="HafSQL Image"
LABEL org.opencontainers.image.description="Runs HafSQL application"
LABEL io.hive.image.branch="$GIT_CURRENT_BRANCH"
LABEL io.hive.image.commit.log_message="$GIT_LAST_LOG_MESSAGE"
LABEL io.hive.image.commit.author="$GIT_LAST_COMMITTER"
LABEL io.hive.image.commit.date="$GIT_LAST_COMMIT_DATE"

ENTRYPOINT ["deno", "run", "--v8-flags=--max-old-space-size=8000", "--allow-net", "--allow-read", "--allow-env", "--allow-sys", "src/main.ts"]