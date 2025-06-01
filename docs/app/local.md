## Local Development Guide - Local Pattern

This guide tells an AI **exactly** what to do when implementing the **Local Pattern** - creating local development Docker Compose setups within the standardized directory structure. This is one of the five core patterns (app, docker, infra, local, scripts) defined in our system.

**📄 Base Reference:** [base.md](https://github.com/ghostmind-dev/docs/blob/main/docs/app/base.md)

> 🧠 **IMPORTANT:** The AI must read and understand `base.md` first to learn about all five directory patterns, then return here for specific Local Pattern implementation details.

**📍 Pattern Focus:** This document covers the `local/` directory pattern only. For other patterns, refer to their respective documentation.

---

# 1. Purpose

The `local/` directory defines the **Local Pattern**: the setup and configuration required to run an application or service locally, primarily using Docker Compose. This makes local development and testing easy and consistent across environments.

# 2. Prerequisites

- **You MUST read [`base.md`](https://github.com/ghostmind-dev/docs/blob/main/docs/app/base.md) before proceeding.**
- Review the `app/` and `docker/` directories. Make sure all required Dockerfiles exist and the app is ready to be run locally.

# 3. Compose File Creation

- The main job is to create a `compose.yaml` file (or equivalent) inside the `local/` directory.
- This file should define all services required to run the app locally, using standardized environment variables and volume mounts.

# 4. Volume Conventions

- **LOCALHOST_SRC** (REQUIRED): Used to reference the volume source in every compose.yaml. It should always be included in the `volumes` section.
- **SRC** (OPTIONAL): Represents the root of the devcontainer app (e.g., `/workspaces/app_name`). Use only if needed.
- **APP** (OPTIONAL): Application name or identifier, use if relevant to the service.

# 5. Environment Variables

- Use the `.env.local` file for local environment overrides whenever possible.
- Environment variables like `APP`, `LOCALHOST_SRC`, and others may be referenced directly in the compose file.

# 6. Implementation Steps

1. **Verify Dockerfiles**: Before you start, check the `docker/` folder to ensure all required Dockerfiles exist and are correct for local development.
2. **Check the App**: Review the `app/` folder to ensure the app is ready to run locally (dependencies, entrypoints, etc.).
3. **Create `compose.yaml`**: Define your services, referencing the correct context and Dockerfiles. Use the provided conventions for environment variables and volume mounts.
4. **Update `meta.json`**: Once the compose setup is ready, you **must** add or update the `compose` object in the `meta.json` at the project root to reflect the local pattern and any relevant settings.

# 7. Example Compose Files

## Example 1

```yaml
services:
  pocket:
    container_name: ${APP}
    build:
      context: ${SRC}/potion/${APP}/app
      dockerfile: ${SRC}/potion/${APP}/docker/Dockerfile
      args:
        LOCAL: 'true'
    env_file:
      - ${SRC}/potion/${APP}/.env.local
    ports:
      - ${PORT}:${PORT}
    environment:
      APP: ${APP}
      LOCALHOST_SRC: ${LOCALHOST_SRC}
    volumes:
      - ${LOCALHOST_SRC}/potion/${APP}/app:/app/
    command: ['run', '--allow-all', '--watch', 'main.ts']
```

## Example 2

```yaml
services:
  webui:
    build:
      dockerfile: ../webui/Dockerfile
      args:
        LOCAL: 'true'
    env_file:
      - ../.env.local
    ports:
      - ${WEBUI_PORT}:${WEBUI_PORT}
    environment:
      LOCALHOST_SRC: ${LOCALHOST_SRC}
    volumes:
      - ${LOCALHOST_SRC}/webui/tmp/app/backend/data:/app/backend/data
```

# 8. Required meta.json Update

After adding or modifying the local compose file, **update the `meta.json`** to include a `compose` object describing the local configuration. Always refer to the [`meta.json` schema](https://github.com/ghostmind-dev/config/blob/main/config/meta/schema.json) for the required structure and fields.

---

**Summary:**

- Always read `base.md` before implementing.
- Compose setup must reference `LOCALHOST_SRC` in all volumes.
- Review and verify all Docker and app components first.
- Add a `compose` object to `meta.json` reflecting local setup.
- Use the examples above as a guide, but adapt as needed for your app.
