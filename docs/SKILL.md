---
name: ghostmind-system
description: This skill should be used when working with the Ghostmind development system, which uses meta.json as a central configuration for Docker, Compose, Terraform, and Tmux. Use this skill when creating or modifying configurations for any of these components, setting up new applications, or understanding how the system components interconnect.
---

# Ghostmind Development System

## Overview

The Ghostmind system is a configuration-driven development workflow where **meta.json serves as the central configuration** that defines and connects all application components. The system enables incremental, modular development through standardized configurations for Docker, Docker Compose, Terraform, and Tmux.

Key principle: **Deterministic setup first, creativity after.** The system provides flexible but well-defined patterns that must be followed to enable tooling and automation.

## When to Use This Skill

Use this skill when:
- Setting up a new application or service with the Ghostmind system
- Creating or modifying Docker, Compose, Terraform, or Tmux configurations
- Understanding how meta.json connects different components
- Working within VS Code Dev Containers (95% of Ghostmind development)
- Following Ghostmind's incremental development workflow

## Core Concepts

### The Central Role of meta.json

Everything in the Ghostmind system starts with `meta.json`. This file:
- Defines what components exist in the application
- Links different parts together (Docker, Compose, Terraform, Tmux)
- Allows dynamic behavior changes through configuration
- Enables the `run` tool to orchestrate the application

**Critical insight:** The structure is flexible. `meta.json` describes where things are and how they're configured, not prescribing rigid folder structures or naming conventions.

### Development Environment

**95% of applications are developed in VS Code Dev Containers**, which provides:
- Pre-configured development environment
- Consistent tooling across team members
- Access to system variables (`SRC`, `LOCALHOST_SRC`)
- Integration with the `run` tool

### Critical Environment Variables

- **`SRC`** - Root path inside the dev container (e.g., `/workspaces/project-name/`)
- **`LOCALHOST_SRC`** - Host machine path to the same location (e.g., `/Users/developer/projects/project-name/`)

**Why both matter:** When running Docker-from-Docker, file mounting requires host paths (`LOCALHOST_SRC`), not container paths (`SRC`).

## Incremental Development Workflow

The Ghostmind workflow is **modular and incremental**, working on isolated units:

1. **Prototype** - Build the application locally (no Docker)
2. **Containerize** - Create Docker configuration, test in container
3. **Local Development** - Set up Docker Compose for dev environment (mirrors production)
4. **Deploy** - Create Terraform configuration for Cloud Run deployment

Each step builds on the previous, with meta.json updated to reflect new components.

## Core Capabilities

### 1. Creating Docker Configurations

**Purpose:** Package the application into a Docker image

To create Docker configuration:
1. Read `references/docker-overview.md` for patterns and conventions
2. Fetch the meta.json schema from `https://raw.githubusercontent.com/ghostmind-dev/run/refs/heads/main/meta/schema.json` to understand the `docker` property structure
3. Update `meta.json` with Docker configuration:
   - Image name and URL
   - Build context (usually `app/`)
   - Dockerfile location
   - Tag modifiers
4. Create the Dockerfile in the specified location

**Key insight:** The Dockerfile can be anywhere and named anything - meta.json describes where it is.

### 2. Creating Compose Configurations

**Purpose:** Enable local development with Docker Compose

To create Compose configuration:
1. Read `references/compose-overview.md` for patterns
2. Fetch the meta.json schema from `https://raw.githubusercontent.com/ghostmind-dev/run/refs/heads/main/meta/schema.json` for the `compose` property structure
3. Update `meta.json` with Compose configuration:
   - Root directory location
   - Custom filename if needed
   - Links to Docker images defined in the `docker` section
4. Create `compose.yaml` in the specified directory

**Important:** Compose is ONLY for development, never for production deployment.

### 3. Creating Terraform Configurations

**Purpose:** Deploy infrastructure to Google Cloud Run using Infrastructure-as-Code

To create Terraform configuration:
1. Read `references/terraform-overview.md` for deployment patterns
2. Fetch the meta.json schema from `https://raw.githubusercontent.com/ghostmind-dev/run/refs/heads/main/meta/schema.json` for the `terraform` property structure
3. Update `meta.json` with Terraform configuration:
   - Path to Terraform files
   - References to Docker containers to deploy
   - Global or local scope settings
4. Create Terraform files in the specified directory

**Note:** Terraform configurations are optimized for Google Cloud Run.

### 4. Creating Tmux Configurations

**Purpose:** Configure tmux session layouts with windows, panes, and sections

To create Tmux configuration:
1. Read `references/tmux-sections-guide.md` for comprehensive layout patterns
2. Fetch the meta.json schema from `https://raw.githubusercontent.com/ghostmind-dev/run/refs/heads/main/meta/schema.json` for the `sessions` property structure
3. Update `meta.json` with tmux session configuration:
   - Window definitions
   - Layout type (sections, grid, compact)
   - Pane configurations with paths and commands
   - Section-based hierarchical splitting

**Tmux supports sophisticated layouts:**
- Section-based (hierarchical horizontal/vertical splitting)
- Grid layouts (single, vertical, horizontal, two-by-two, main-side)
- Custom pane commands and SSH targets

### 5. Understanding the System Architecture

To understand how components connect:
1. Read `references/system-overview.md` for the big picture
2. Recognize that all components are loosely coupled through meta.json
3. Understand the flow: `meta.json` → Docker → Compose → Terraform
4. Remember: Not all apps need all components (structure adapts to needs)

## Working with meta.json

The `meta.json` schema (available at `https://raw.githubusercontent.com/ghostmind-dev/run/refs/heads/main/meta/schema.json`) defines:

**Core Properties:**
- `id`, `name`, `version`, `description`, `type`
- `global` - Boolean flag for global configuration

**Component Configurations:**
- `docker` - Docker image settings
- `compose` - Docker Compose configurations
- `terraform` - Infrastructure-as-code
- `sessions` - Tmux layouts

**Application Settings:**
- `port` - Application port
- `routines` - Executable commands mapped by name
- `secrets` - Environment variable file paths
- `tags` - String tags for organization
- `mcp` - Model Context Protocol server definitions
- `tunnel` - Network exposure mappings

## Resources

This skill includes comprehensive reference documentation:

### references/

**system-overview.md** - Core system concepts, architecture, and how components connect

**docker-overview.md** - Docker configuration patterns and conventions

**compose-overview.md** - Docker Compose setup for local development

**terraform-overview.md** - Terraform deployment patterns for Cloud Run

**tmux-sections-guide.md** - Comprehensive tmux layout configuration guide

**Usage:** Load specific references as needed when working on related tasks. For example, when creating Docker configuration, read `docker-overview.md` and fetch the meta.json schema from `https://raw.githubusercontent.com/ghostmind-dev/run/refs/heads/main/meta/schema.json` to understand the structure.

### scripts/

Currently empty. Will be populated with automation scripts as common patterns emerge.

### assets/

Currently empty. Will be populated with template configurations as standard patterns are identified.

## Best Practices

1. **Always start with meta.json** - Define the configuration before creating files
2. **Work incrementally** - Build one component at a time, test, then move forward
3. **Follow the schema** - Fetch the latest schema from `https://raw.githubusercontent.com/ghostmind-dev/run/refs/heads/main/meta/schema.json`
4. **Read the relevant docs** - Each component has detailed documentation in `references/`
5. **Test locally first** - Use Compose to mirror production before deploying with Terraform
6. **Use proper paths** - Remember `SRC` vs `LOCALHOST_SRC` for Docker-in-Docker scenarios
