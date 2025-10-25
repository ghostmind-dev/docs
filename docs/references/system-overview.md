# System Overview

## Introduction

This document provides a high-level overview of how applications are structured and connected in our system. The goal is to understand the relationships between different components without diving into implementation details.

## Core Concept: Everything Starts with `meta.json`

The `meta.json` file is the **central configuration** that defines an application. It acts as the static config that:
- Defines what components exist in the application
- Links different parts together (app code, Docker, Compose, Terraform)
- Allows dynamic behavior changes through configuration
- Enables the `run` tool to understand and orchestrate the application

**Key insight:** An application can exist with just a `meta.json` file. All other components are optional and defined within this config.

## System Architecture Components

### 1. Application Code (`app/`)

**Purpose:** Contains the actual source code of your application
**What it can be:** Node.js, Go, Python, or any application type
**In meta.json:** Not explicitly configured (it's the default working directory)

### 2. Containerization (`docker/`)

**Purpose:** Defines how to package the application into a Docker image
**Contains:** Dockerfile(s) for building container images
**In meta.json:** Configured under the `docker` property with:
- Multiple image definitions possible
- References to build context (usually `app/`)
- Image tags and registry information

### 3. Local Development (`local/` or `compose/`)

**Purpose:** Enables local development with Docker Compose
**Contains:** `compose.yaml` defining services, volumes, networks
**Important:** Only used for development, never for production deployment
**In meta.json:** Configured under the `compose` property with:
- Root directory location
- Custom filename if needed
- Links to Docker images defined in the `docker` section

### 4. Infrastructure Deployment (`infra/`)

**Purpose:** Infrastructure-as-Code using Terraform for cloud deployment
**Target:** Currently optimized for Google Cloud Run
**In meta.json:** Configured under the `terraform` property with:
- Path to Terraform configurations
- References to Docker containers to deploy
- Global or local scope settings

## How Components Connect

```
meta.json (Central Config)
    |
    ├── app/ (Source Code)
    |    └── Your application code
    |
    ├── docker/ (Container Definition)
    |    └── Dockerfile → builds from app/
    |
    ├── local/ (Development Environment)
    |    └── compose.yaml → uses docker/ images
    |                     → mounts app/ for hot reload
    |
    └── infra/ (Production Deployment)
         └── Terraform files → deploys docker/ images
                            → configures cloud resources
```

## Environment Variables

Environment variables are managed at the source level:

- **`.env.base`** - Shared across all environments
- **`.env.local`** - Local development specific
- **`.env.production`** - Production specific (when needed)

The `run` tool automatically injects appropriate environment variables based on context.

## The `run` Tool

A unified CLI tool that:
- Reads `meta.json` to understand the application structure
- Provides utilities for each component (Docker, Compose, Terraform)
- Automatically handles environment variable injection
- Orchestrates builds, deployments, and local development

## Dynamic Structure

Not all applications need all components:

- **Config-only apps:** Just `meta.json` + `infra/` (e.g., database deployment)
- **Simple services:** `meta.json` + `app/` (no containerization needed)
- **Full applications:** All components present

**Important:** The structure is flexible. The `meta.json` defines what exists and how it connects.

## Development Workflow Context

**95% of applications are developed in VS Code Dev Containers**, which provides:
- Pre-configured development environment
- Consistent tooling across team members
- Access to system variables and utilities
- Integration with the `run` tool

### Critical Environment Variables: `SRC` and `LOCALHOST_SRC`

**These are fundamental to the entire system and used heavily throughout the application:**

- **`SRC`** - The root path of the application when running inside the dev container
  - Example: `/workspaces/project-name/`
  - Used for all operations within the dev container

- **`LOCALHOST_SRC`** - The host machine path to the same location
  - Example: `/Users/developer/projects/project-name/`
  - **Critical for Docker-in-Docker operations**

### Why Both Are Essential

When running **Docker outside of Docker** from within the dev container:
- **File mounting requires host paths**, not container paths
- **`SRC`** is used for operations inside the dev container
- **`LOCALHOST_SRC`** is used when mounting files/folders into containers launched from the dev container

**Example scenario:**
```bash
# Inside dev container, mounting a volume:
# ❌ Wrong: docker run -v $SRC/data:/app/data image
# ✅ Correct: docker run -v $LOCALHOST_SRC/data:/app/data image
```

This dual-path system enables seamless Docker operations while maintaining the dev container workflow that Ghostmind relies on for development.

## Key Takeaway

The system is designed around **configuration-driven development**:
1. `meta.json` defines what exists
2. Components are loosely coupled through configuration
3. The `run` tool orchestrates based on the configuration
4. Structure can adapt to application needs

This approach enables consistent tooling and workflows while maintaining flexibility for different application types and deployment scenarios.