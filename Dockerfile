FROM denoland/deno:2.5.2

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

ENTRYPOINT ["deno", "run", "--v8-flags=--max-old-space-size=8000", "--allow-net", "--allow-read", "--allow-env", "--allow-sys", "src/main.ts"]