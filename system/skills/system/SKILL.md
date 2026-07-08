---
name: ghostmind-system
description: >-
  Use this skill when creating new applications, scaffolding project structures, or configuring
  meta.json in the Ghostmind development system. Trigger whenever the user wants to create a new
  app, service, API, or project — generate the skeleton (app/, docker/, infra/, scripts/, meta.json,
  .env.base, Readme.md). Also trigger when modifying meta.json, setting up Docker/Compose/Terraform
  configurations, writing custom Deno scripts, configuring tmux sessions or herdr scenes, or
  working with environment variables, devcontainers, SRC/LOCALHOST_SRC paths, or vault secrets.
  This is the go-to skill for any Ghostmind project setup, structure, or configuration work.
---

# Ghostmind System

This skill enables creating and configuring applications in the Ghostmind development system. The system is configuration-driven: `meta.json` is the central hub, and the `run` CLI (`jsr:@ghostmind/run`) orchestrates Docker, Compose, Terraform, Tmux, herdr scenes, custom scripts, routines, and secrets based on that configuration.

The primary use cases are **scaffolding new apps** and **modifying meta.json** quickly and correctly.

## Rule #1: Fetch the Schema First

Before any work involving `meta.json`, fetch the latest schema with WebFetch:

```
https://raw.githubusercontent.com/ghostmind-dev/run/refs/heads/main/meta/schema.json
```

The schema is the single source of truth for all meta.json properties. It changes over time. Always fetch it.

---

## Scaffolding a New App

When the user asks to create a new app, generate the appropriate skeleton. Not every app needs every folder — choose based on what the app actually requires.

### Deciding What to Generate

| User wants...                                    | Generate                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| App with local dev + prod (compose-based)        | `app/`, `docker/`, `scripts/`, `meta.json`, `.env.base`, `.env.local`, `.env.prod`, `Readme.md`           |
| App deployed to Cloud Run (registry push needed) | `app/`, `docker/`, `infra/`, `scripts/`, `meta.json`, `.env.base`, `.env.local`, `.env.prod`, `Readme.md` |
| Infrastructure only (database, bucket, etc.)     | `infra/`, `meta.json`, `.env.base`, `.env.local`, `.env.prod`, `Readme.md`                                |
| Simple script/tool project                       | `scripts/`, `meta.json`, `Readme.md`                                                                      |

Always generate all three env files: `.env.base` (committed), `.env.local` (gitignored), `.env.prod` (gitignored).

### Full Skeleton Example

For a request like _"create a Node.js API server with hot reloading, deployed with Docker Compose"_:

```
api-server/
├── meta.json
├── Readme.md
├── app/
│   ├── package.json
│   └── src/
│       └── index.ts
├── docker/
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── compose.local.yaml
│   └── compose.prod.yaml
├── scripts/
│   ├── dev.ts
│   └── init.ts
├── .env.base               # committed
├── .env.local              # gitignored
└── .env.prod               # gitignored
```

---

## Docker Pattern: Local vs Production

The system uses a **single Dockerfile** for both environments, controlled by an `ENV` build argument. Two separate compose files handle the differences between local development and production.

### Dockerfile (Single File, Conditional Behavior)

The Dockerfile uses `ARG ENV` to branch behavior:

```dockerfile
FROM node:20

WORKDIR /app

COPY app/package*.json ./

ARG ENV

# Install dev dependencies only for local (e.g., nodemon, ts-node)
RUN if [ "$ENV" = "local" ]; then \
      npm install --include=dev; \
    else \
      npm install --omit=dev; \
    fi

WORKDIR /app/app

COPY app .

# Build only for non-local environments (local uses hot reload, no build needed)
RUN if [ "$ENV" != "local" ]; then npm run build; fi

EXPOSE 3000

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

**Key patterns:**

- `npm install --include=dev` for local (needs devDependencies like nodemon, ts-node)
- `npm install --omit=dev` for prod (smaller image)
- `npm install --include=optional` when platform-specific packages are needed (e.g., `sharp` needs `libvips`)
- `npm run build` only runs for non-local (local uses hot reload on source files)

**Python equivalent:**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY app/requirements.txt ./

ARG ENV

RUN if [ "$ENV" = "local" ]; then \
      pip install -r requirements.txt && pip install watchdog; \
    else \
      pip install -r requirements.txt; \
    fi

WORKDIR /app/app
COPY app .

EXPOSE 8000

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

### entrypoint.sh

Switches the startup command based on environment:

```bash
#!/bin/sh

cd /app/app

if [ "$ENV" = "local" ]; then
  exec npm run dev
else
  exec npm run start
fi
```

**Python equivalent:**

```bash
#!/bin/sh

cd /app/app

if [ "$ENV" = "local" ]; then
  exec uvicorn main:app --reload --host 0.0.0.0 --port 8000
else
  exec uvicorn main:app --host 0.0.0.0 --port 8000
fi
```

### compose.local.yaml (Development — With Volume Mounts)

The local compose file mounts source code for hot reloading:

```yaml
services:
  app:
    container_name: ${PROJECT}-${APP}
    build:
      context: ${SRC}/app-name
      dockerfile: ${SRC}/app-name/docker/Dockerfile
      args:
        ENV: ${ENV}
    env_file:
      - ${SRC}/app-name/.env.base
      - ${SRC}/app-name/.env.local
    ports:
      - ${PORT}:${PORT}
    environment:
      APP: ${APP}
      LOCALHOST_SRC: ${LOCALHOST_SRC}
      ENV: ${ENV}
    volumes:
      - ${LOCALHOST_SRC}/app-name/app:/app/app
```

**The `volumes` line is what enables hot reloading** — source code changes on the host are reflected immediately inside the container.

### compose.prod.yaml (Production — No Volume Mounts)

The prod compose file is identical except: no `volumes`, and uses `.env.prod` instead of `.env.local`:

```yaml
services:
  app:
    container_name: ${PROJECT}-${APP}
    build:
      context: ${SRC}/app-name
      dockerfile: ${SRC}/app-name/docker/Dockerfile
      args:
        ENV: ${ENV}
    env_file:
      - ${SRC}/app-name/.env.base
      - ${SRC}/app-name/.env.prod
    ports:
      - ${PORT}:${PORT}
    environment:
      APP: ${APP}
      LOCALHOST_SRC: ${LOCALHOST_SRC}
      ENV: ${ENV}
```

**Key differences between local and prod compose:**

| Aspect   | `compose.local.yaml`              | `compose.prod.yaml`              |
| -------- | --------------------------------- | -------------------------------- |
| Volumes  | Mounts source code for hot reload | No volume mounts                 |
| env_file | `.env.base` + `.env.local`        | `.env.base` + `.env.prod`        |
| Behavior | `npm run dev` (via entrypoint)    | `npm run start` (via entrypoint) |
| Build    | Skips `npm run build`             | Runs `npm run build`             |

### SRC vs LOCALHOST_SRC (Critical)

These two variables are fundamental to the entire system. When developing inside a devcontainer, all Docker commands run on the **host machine**, not inside the devcontainer. This means volume mounts, which are essential for hot reloading, must use host paths.

- **`SRC`** — Path inside the devcontainer (e.g., `/workspaces/my-project`). Use for file references that the devcontainer resolves: build context, dockerfile, env_file paths.
- **`LOCALHOST_SRC`** — Path on the host machine (e.g., `/Users/me/code/my-project`). Use for anything Docker needs to resolve on the host: **volume mounts** (hot reloading), and any operation that interacts with the Docker daemon directly.

Without `LOCALHOST_SRC`, volume mounts silently fail — the container starts but file changes aren't reflected, breaking hot reload entirely.

**Rule:** `${SRC}` for build context, dockerfile, env_file. `${LOCALHOST_SRC}` for volumes and Docker daemon operations.

---

## Project Structure

### Single App

```
my-app/
├── meta.json
├── Readme.md
├── app/                # Application code (any language/framework)
├── docker/
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── compose.local.yaml
│   └── compose.prod.yaml
├── infra/              # Terraform (only when needed)
├── scripts/
│   ├── dev.ts
│   └── init.ts
├── .env.base
├── .env.local
└── .env.prod
```

### Multi-App Project

Projects contain multiple sub-apps, each with their own `meta.json`:

```
my-project/
├── meta.json           # Root config (PROJECT variable, tmux, routines)
├── ui/
│   ├── meta.json       # APP = "ui"
│   ├── app/
│   ├── docker/
│   └── scripts/
├── api/
│   ├── meta.json       # APP = "api"
│   ├── app/
│   ├── docker/
│   └── scripts/
└── db/
    ├── meta.json       # Infrastructure only
    └── infra/
```

The root `meta.json` typically has `type: "project"` and contains tmux sessions and project-level routines. Each sub-app has its own compose, docker, scripts, and env files.

---

## meta.json Reference

### Required Properties

```json
{
  "id": "H8eW8uubGfEY",
  "name": "my-app"
}
```

- **`id`** (string) — Unique identifier, generated once, never changes
- **`name`** (string) — Becomes `PROJECT` (root meta.json) or `APP` (sub-app meta.json)

### Optional Metadata

| Property      | Type     | Description                                      |
| ------------- | -------- | ------------------------------------------------ |
| `version`     | string   | Semantic version (e.g., `"0.0.1"`)               |
| `description` | string   | Human-readable description                       |
| `type`        | string   | `"app"`, `"project"`, or `"template"`            |
| `tags`        | string[] | Categorization tags                              |
| `port`        | number   | App port, available as `${PORT}` in substitution |

### Variable Substitution

meta.json and .env files support `${VARIABLE_NAME}` syntax. Available: `${PROJECT}`, `${APP}`, `${PORT}`, `${ENV}`, and anything from `.env` files.

---

### `compose` — Local & Production Services

```json
{
  "compose": {
    "default": {
      "root": "docker",
      "filename": "compose.${ENV}.yaml"
    }
  }
}
```

The `compose.${ENV}.yaml` pattern is key — when run with `--cible=local`, it uses `compose.local.yaml`. With `--cible=prod`, it uses `compose.prod.yaml`.

| Property          | Type    | Description                                                  |
| ----------------- | ------- | ------------------------------------------------------------ |
| `root`            | string  | Directory containing the compose file                        |
| `filename`        | string  | Compose filename (supports `${ENV}` substitution)            |
| `use_project_env` | boolean | Use PROJECT as docker compose project name (default: `true`) |
| `down`            | boolean | Run `docker compose down` before `up` (default: `true`)      |

---

### `docker` — Registry Images

Only needed when **pushing images to a container registry** (e.g., Cloud Run, Kubernetes). Skip this if the app only uses Compose.

```json
{
  "docker": {
    "default": {
      "root": "docker",
      "image": "gcr.io/my-project/my-app",
      "context_dir": "app"
    }
  }
}
```

| Property        | Type     | Description                                                     |
| --------------- | -------- | --------------------------------------------------------------- |
| `root`          | string   | Directory containing the Dockerfile(s)                          |
| `image`         | string   | Full registry path (e.g., `gcr.io/proj/app`, `ghcr.io/org/app`) |
| `env_based`     | boolean  | When `true`, uses `Dockerfile.dev`, `Dockerfile.prod`, etc.     |
| `context_dir`   | string   | Docker build context (relative to project root)                 |
| `tag_modifiers` | string[] | Additional tags (e.g., `["latest", "v1.0.0"]`)                  |

---

### `terraform` — Infrastructure as Code

For production deployments, primarily Google Cloud Run. Not all apps use Terraform.

```json
{
  "terraform": {
    "core": {
      "path": "infra",
      "global": false,
      "containers": ["default"]
    }
  }
}
```

| Property     | Type     | Description                                                       |
| ------------ | -------- | ----------------------------------------------------------------- |
| `path`       | string   | Directory containing Terraform files                              |
| `global`     | boolean  | Whether this is a global-scope configuration                      |
| `containers` | string[] | References to `docker` keys (provides `IMAGE_DIGEST_*` variables) |

**Required files (4 minimum per Terraform directory):**

1. **`backend.tf`** — `terraform { backend "gcs" {} }`
2. **`versions.tf`** — Provider requirements (google, `>= 1.3.7`)
3. **`main.tf`** — Resources (see Cloud Run example below)
4. **`variables.tf`** — Auto-generated by tooling, do not create manually

**Cloud Run main.tf example:**

```hcl
provider "google" {
  project = var.GCP_PROJECT_ID
}

resource "google_cloud_run_v2_service" "default" {
  name     = "${var.PROJECT}-${var.ENVIRONMENT}-${var.APP}"
  location = "us-central1"
  deletion_protection = false

  template {
    containers {
      image = var.IMAGE_DIGEST_DEFAULT
      ports { container_port = var.PORT }
      dynamic "env" {
        for_each = local.env_vars
        content {
          name  = env.value.name
          value = env.value.value
        }
      }
    }
  }
}
```

---

### `custom` — Scripts

```json
{
  "custom": {
    "root": "scripts"
  }
}
```

Each `.ts` file in the scripts directory is invoked by filename: `run custom <name> [flags]`.

**Standard scripts — every app should have these two:**

**`scripts/dev.ts`** — Local development (used with `--cible=local`):

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerComposeBuild, dockerComposeUp } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const { has } = opts;

  if (has('build')) {
    await dockerComposeBuild({});
  }
  if (has('up')) {
    await dockerComposeUp({ forceRecreate: true });
  }
}
```

**`scripts/init.ts`** — Production initialization (used with `--cible=prod`):

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerComposeBuild, dockerComposeUp } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const { has } = opts;

  if (has('build')) {
    await dockerComposeBuild({});
  }
  if (has('up')) {
    await dockerComposeUp({ forceRecreate: true, detach: true });
  }
}
```

The difference: `init.ts` uses `detach: true` so the container runs in the background for production.

**Key helpers:** `has(flag)` checks flags, `extract(name)` parses `KEY=VALUE` args, `start(config)` runs prioritized commands. Scripts can import any Deno-compatible library.

---

### `routines` — Shell Aliases

```json
{
  "routines": {
    "dev": "run custom dev build up --cible=local",
    "init": "run custom init build up --cible=prod",
    "tmux_init": "run tmux init my-app --all",
    "tmux_attach": "run tmux attach my-app"
  }
}
```

The `--cible=local` and `--cible=prod` flags set the `ENV` variable, which selects the correct compose file (`compose.local.yaml` vs `compose.prod.yaml`).

---

### `tmux` — Terminal Sessions

```json
{
  "tmux": {
    "sessions": [
      {
        "name": "my-app",
        "windows": [
          {
            "name": "dev",
            "layout": "compact",
            "compact": {
              "type": "main-side",
              "panes": {
                "server": "sleep 5 && run routine dev",
                "execution-shell": "echo 'Ready'"
              }
            }
          }
        ]
      }
    ]
  }
}
```

**Layout modes:** `compact` (key-value panes), `grid` (pane objects with path/sshTarget), `sections` (hierarchical splits with ratios).

**Grid types:** `single`, `vertical`, `horizontal`, `two-by-two`, `main-side`

The `execution-shell` pane is a common pattern — an empty pane where AI agents or developers can run ad-hoc commands without interrupting long-running processes.

---

### `herdr` — Scenes

[herdr](https://github.com/ogulcancelik/herdr) is the terminal agent-multiplexer that will eventually replace tmux in the system; both configs coexist in meta.json during the transition. herdr itself has no "scene" concept — the `run` CLI provides it. A **scene** is a named, predefined arrangement of herdr **workspaces → tabs → panes** that maps to a named herdr session.

Two rules distinguish herdr scenes from the tmux config:

1. **Panes are arrangement-only — no startup commands.** Each pane is either a bare name string, or an object with a `name` and a `description` documenting how the team (or an AI agent) should use that pane. Descriptions are documentation, never executed.
2. **Compact panes are an ordered array** (top-left to bottom-right), not the name→command object tmux uses.

#### Creating a Scene

Add a top-level `herdr` block with `scenes`. Each scene has a `name` and `workspaces`; each workspace has a `label`, an optional `cwd` (relative to the meta.json location) and `env`, and `tabs`; each tab has a `label` and a layout (`compact`, `grid`, or `sections` — same vocabulary and grid types as tmux: `single`, `vertical`, `horizontal`, `two-by-two`, `main-side`).

```json
{
  "herdr": {
    "scenes": [
      {
        "name": "my-platform",
        "workspaces": [
          {
            "label": "api",
            "cwd": "app",
            "tabs": [
              {
                "label": "dev",
                "layout": "compact",
                "compact": {
                  "type": "main-side",
                  "panes": [
                    {
                      "name": "server",
                      "description": "long-running dev server, do not interrupt"
                    },
                    "logs",
                    {
                      "name": "execution-shell",
                      "description": "run ad-hoc commands here without interrupting other panes"
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "routines": {
    "herdr_init": "run herdr init my-platform --all",
    "herdr_attach": "run herdr attach my-platform",
    "herdr_terminate": "run herdr terminate my-platform --delete"
  }
}
```

#### Single vs Spread Across Multiple meta.json Files

A scene can live entirely in one meta.json, or be spread across the project: the root meta.json and any sub-app meta.json can each contribute `workspaces` to the **same scene name** (a natural fit — herdr workspaces organize by repo/folder, so each app contributes its own workspace). `run herdr init <scene> --all` discovers every meta.json in the project that defines the scene and assembles them into one session, resolving each workspace's `cwd` relative to its own meta.json.

#### Commands

| Command                                   | Purpose                                                              |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `run herdr init <scene> [--all] [--reset]` | Build the scene (starts the herdr server headless if needed)         |
| `run herdr attach <scene>`                | Attach the terminal UI to the scene's session                        |
| `run herdr terminate <scene> [--delete]`  | Stop the session (`--delete` also removes stored session state)      |
| `run herdr list`                          | List herdr sessions                                                  |

**Gotcha:** like `run tmux init`, running `init` twice without `--reset` **appends** — you get duplicate workspaces with the same label. Use `--reset` to rebuild a scene cleanly.

herdr needs no configuration of its own: install with `brew install herdr`, and the server is managed automatically. Optional user keybindings/themes live in `~/.config/herdr/config.toml`.

---

## Environment Variables

### File Layering

| File         | Purpose                | Git       |
| ------------ | ---------------------- | --------- |
| `.env.base`  | Shared defaults        | Committed |
| `.env.local` | Local dev overrides    | Ignored   |
| `.env.prod`  | Production values      | Ignored   |
| `.env`       | Generated (base + env) | Ignored   |

### Auto-Extracted Variables

- **`PROJECT`** — From root `meta.json` `name`
- **`APP`** — From current directory `meta.json` `name`
- **`PORT`** — From `meta.json` `port`
- **`ENV`** — Set by `--cible` flag (`local`, `prod`, etc.)

### Vault

Secrets are managed through Vault, never committed:

```bash
run vault import    # Pull secrets to local .env files
run vault export    # Push local .env files to Vault
```

---

## Complete Examples

### Example 1: Node.js Next.js App (Compose Only, No Cloud Deploy)

**meta.json:**

```json
{
  "id": "PVQVfCd2pY2U",
  "name": "ui",
  "version": "0.0.1",
  "type": "app",
  "compose": {
    "default": {
      "root": "docker",
      "filename": "compose.${ENV}.yaml"
    }
  },
  "custom": { "root": "scripts" },
  "routines": {
    "dev": "run custom dev build up --cible=local",
    "init": "run custom init build up --cible=prod"
  }
}
```

### Example 2: Multi-App Project Root

**meta.json:**

```json
{
  "id": "_kc2vvsMN7jU",
  "name": "my-platform",
  "type": "project",
  "routines": {
    "tmux_init": "run tmux init my-platform --all",
    "tmux_attach": "run tmux attach my-platform",
    "tmux_terminate": "run tmux terminate my-platform"
  },
  "tmux": {
    "sessions": [
      {
        "name": "my-platform",
        "windows": [
          {
            "name": "home",
            "layout": "compact",
            "compact": {
              "type": "single",
              "panes": { "welcome": "echo 'Welcome!'" }
            }
          }
        ]
      }
    ]
  }
}
```

### Example 3: App with Cloud Run Deployment

```json
{
  "id": "abc123",
  "name": "api",
  "version": "0.0.1",
  "type": "app",
  "port": 3000,
  "docker": {
    "default": {
      "root": "docker",
      "image": "gcr.io/my-project/api",
      "context_dir": "app"
    }
  },
  "compose": {
    "default": {
      "root": "docker",
      "filename": "compose.${ENV}.yaml"
    }
  },
  "terraform": {
    "core": {
      "path": "infra",
      "global": false,
      "containers": ["default"]
    }
  },
  "custom": { "root": "scripts" },
  "routines": {
    "dev": "run custom dev build up --cible=local",
    "init": "run custom init build up --cible=prod",
    "deploy": "run docker build && run docker push && run terraform activate core"
  }
}
```

### Example 4: Infrastructure Only (Database, Bucket)

```json
{
  "id": "ghi789",
  "name": "database",
  "version": "0.0.1",
  "type": "app",
  "terraform": {
    "instance": { "path": "infra", "global": false }
  }
}
```

### Example 5: Script-Only Project

```json
{
  "id": "pqr678",
  "name": "tools",
  "type": "project",
  "custom": { "root": "scripts" },
  "routines": {
    "migrate": "run custom migrate apply",
    "seed": "run custom seed"
  }
}
```

---

## The `run` CLI

The `run` tool (`jsr:@ghostmind/run`) reads `meta.json` and orchestrates all components. It's both a CLI and a Deno TypeScript library.

**Global options:**

- `-c, --cible <env>` — Target environment (`local`, `prod`, `dev`). Sets `ENV` variable, which controls compose file selection via `compose.${ENV}.yaml`
- `-p, --path <path>` — Run from a specific path

Key capabilities: docker build/push, compose up/down/build, terraform activate/destroy, tmux init/attach/terminate, herdr scene init/attach/terminate, custom script execution, routine execution, vault import/export.

---

## Devcontainer

Most projects are developed in VS Code devcontainers, providing a pre-configured environment with Docker-in-Docker capability. The devcontainer sets `SRC` and `LOCALHOST_SRC` automatically:

```json
{
  "containerEnv": {
    "LOCALHOST_SRC": "${localWorkspaceFolder}",
    "SRC": "${containerWorkspaceFolder}"
  }
}
```

---

## Reference

- **run CLI + library**: https://github.com/ghostmind-dev/run
- **meta.json schema**: https://raw.githubusercontent.com/ghostmind-dev/run/refs/heads/main/meta/schema.json
- **GitHub org**: https://github.com/orgs/ghostmind-dev/repositories
