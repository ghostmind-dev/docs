## Local Development Guide - Local Pattern

This guide tells an AI **exactly** what to do when implementing the **Local Pattern** - creating local development Docker Compose setups within the standardized directory structure. This is one of the five core patterns (app, docker, infra, local, scripts) defined in our system.

**📚 Base Reference:** [base.md](https://github.com/ghostmind-dev/docs/blob/main/docs/app/base.md)

> 🧠 **IMPORTANT:** The AI must read and understand `base.md` first to learn about all five directory patterns, then return here for specific Local Pattern implementation details.

**🎯 Pattern Focus:** This document covers the `local/` directory pattern only. For other patterns, refer to their respective documentation.

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
- **SRC** (OPTIONAL): Represents the root of the devcontainer app (e.g., `/workspaces/app_name`). Always use format `${SRC}/path` or `${SRC}appname`.

# 5. Environment Variables

- Use the `.env.local` file for local environment overrides whenever possible.
- Environment variables like `LOCALHOST_SRC`, `SRC`, and others may be referenced directly in the compose file.

# 6. Implementation Steps

1. **Verify Dockerfiles**: Before you start, check the `docker/` folder to ensure all required Dockerfiles exist and are correct for local development.
2. **Check the App**: Review the `app/` folder to ensure the app is ready to run locally (dependencies, entrypoints, etc.).
3. **Create `compose.yaml`**: Define your services, referencing the correct context and Dockerfiles. Use the provided conventions for environment variables and volume mounts.
4. **Update `meta.json`**: Once the compose setup is ready, you **must** add or update the `compose` object in the `meta.json` at the project root to reflect the local pattern and any relevant settings.

# 7. Example Compose Files

## Example 1

```yaml
services:
  potion_next:
    container_name: potion
    build:
      context: ${SRC}/app
      dockerfile: ${SRC}/docker/Dockerfile
      args:
        LOCAL: 'true'
    env_file:
      - ${SRC}/.env.local
    ports:
      - ${PORT}:${PORT}
    environment:
      LOCALHOST_SRC: ${LOCALHOST_SRC}
    volumes:
      - ${LOCALHOST_SRC}/app:/app/
    command: ['run', '--allow-all', '--watch', 'main.ts']
```

## Example 2

```yaml
services:
  webui_server:
    build:
      context: ${SRC}/webui
      dockerfile: ${SRC}/docker/Dockerfile
      args:
        LOCAL: 'true'
    env_file:
      - ${SRC}/.env.local
    ports:
      - ${WEBUI_PORT}:${WEBUI_PORT}
    environment:
      LOCALHOST_SRC: ${LOCALHOST_SRC}
    volumes:
      - ${LOCALHOST_SRC}/webui/tmp/app/backend/data:/app/backend/data
```

## Example 3 - Next.js Development

```yaml
services:
  lapse_app:
    container_name: ${APP:-lapse}
    build:
      context: ${SRC}/app
      dockerfile: ${SRC}/docker/Dockerfile.dev
      target: dev
      args:
        LOCAL: 'true'
    env_file:
      - ${SRC}/.env.local
    ports:
      - ${PORT:-3001}:3000
    environment:
      LOCALHOST_SRC: ${LOCALHOST_SRC}
      NODE_ENV: development
      NEXT_TELEMETRY_DISABLED: 1
    volumes:
      - ${LOCALHOST_SRC}/app:/app
      - /app/node_modules
      - /app/.next
    command: ['npm', 'run', 'dev']
    working_dir: /app
```

## LOCAL

Always include LOCAL argument in the docker build step

```yaml
build:
  context: ${SRC}/app
  dockerfile: ${SRC}/docker/Dockerfile
  args:
    LOCAL: 'true'
```

# 8. Required meta.json Update

After adding or modifying the local compose file, **update the `meta.json`** to include a `compose` object describing the local configuration. Always refer to the [`meta.json` schema](https://github.com/ghostmind-dev/config/blob/main/config/meta/schema.json) for the required structure and fields.

# 9. Development Best Practices & Troubleshooting

## Port Binding Issues

- **Always use different ports for local development** (e.g., `3001:3000`) to avoid conflicts with other services
- Use environment variables like `${PORT:-3001}` to make ports configurable
- Check for existing containers using the same port: `docker ps` before starting

## Development vs Production Dockerfiles

- **Create separate Dockerfiles for development** (e.g., `Dockerfile.dev`) that:
  - Include dev dependencies (`npm ci` instead of `npm ci --only=production`)
  - Use development commands (`npm run dev` instead of production build)
  - Support hot reloading with proper volume mounts
- **Use multi-stage builds** with a `dev` target for development

## Next.js Specific Considerations

- **Volume exclusions**: Always exclude `node_modules` and `.next` from volume mounts to prevent conflicts:
  ```yaml
  volumes:
    - ${LOCALHOST_SRC}/app:/app
    - /app/node_modules
    - /app/.next
  ```
- **Environment variables**: Set `NODE_ENV=development` and `NEXT_TELEMETRY_DISABLED=1`
- **Working directory**: Ensure `working_dir: /app` is set for proper command execution

## Container Name Conflicts

- **Use unique container names** with the pattern `${APP:-default_name}`
- **Clean up existing containers** before starting: `docker stop <name> && docker rm <name>`
- **Use compose down** to clean up all services: `docker compose down`

## Host Access Issues

- **Ensure proper port mapping**: Container port (e.g., 3000) must be mapped to host port (e.g., 3001)
- **Check container status**: Use `docker compose ps` to verify services are running with correct port mappings
- **Verify network binding**: Ensure the app binds to `0.0.0.0` not just `localhost` inside the container

# 10. Future Exploration Ideas

## Unified Compose Architecture

**💡 Idea to Explore:** Investigate the possibility of having only one compose file for all sub-apps/sub-services in a multi-service architecture.

**Potential Benefits:**
- Simplified orchestration across all services
- Centralized configuration management
- Easier cross-service communication and networking
- Reduced complexity in managing multiple compose files

**Considerations:**
- How to maintain modularity and separation of concerns
- Environment variable management across different services
- Build context organization for multiple apps
- Service discovery and inter-service communication patterns
- Impact on development workflow and team collaboration

**Research Areas:**
- Docker Compose include/extends functionality
- Service profiles for selective service startup
- Dynamic service configuration based on environment
- Integration with existing `meta.json` patterns

> 🔍 **Note:** This is a conceptual exploration for future development. Current implementation should follow the established pattern of individual compose files per service.

---

**Summary:**

- Always read `base.md` before implementing.
- Compose setup must reference `LOCALHOST_SRC` in all volumes.
- Review and verify all Docker and app components first.
- Add a `compose` object to `meta.json` reflecting local setup.
- Use the examples above as a guide, but adapt as needed for your app.
- **Create development-specific Dockerfiles for better local development experience.**
- **Use different ports for local development to avoid conflicts.**
- **Pay attention to volume mounts and exclusions for hot reloading frameworks.**