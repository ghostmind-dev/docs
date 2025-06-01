**Application Structure & Documentation Guide**

## Introduction

Welcome! This document provides an overview of how each application in our repository is structured. It’s intended as a high-level guide for an AI agent (or any developer) to understand the conventions and file placements without diving too deeply into the exact steps for creating content. More detailed instructions belong in their respective docs (e.g., Docker docs, Infra docs, Script docs).

Each application (or “app”) follows this directory pattern:

1. **app/**
2. **docker/**
3. **infra/**
4. **local/**
5. **scripts/**

At the root of each app’s folder, these files always exist:

- `.env.template`
- `README.md`
- `meta.json`

Below, you’ll find a brief explanation for each directory and file—just enough that an AI agent knows _what_ it is and _where_ to look. Details on _how_ to build or configure reside in the individual docs (e.g., `docker.md`, `infra.md`, etc.).

---

## 1. `app/` Directory

- **What it is:**
  The core application code folder. Contains source files, entrypoints, and (optionally) unit tests.
- **Why it exists:**
  Houses the logic and implementation of the application itself—controllers, models, utilities, routing, etc.
- **AI cue:**
  “If I need to work with application code, look under `app/`.”

---

## 2. `docker/` Directory

- **What it is:**
  A place for Docker-related files required to build container images.
- **Why it exists:**
  Standardizes where Dockerfiles or any container build definitions live. The AI agent can reference this folder when asked to update or generate Docker artifacts.
- **AI cue:**
  “When handling container builds, check `docker/`.”

---

## 3. `infra/` Directory

- **What it is:**
  Infrastructure-as-code folder (currently standardized on Terraform).
- **Why it exists:**
  Contains all Terraform files needed to deploy this app to cloud or other environments. Four types of files must always be created here (detailed in infra docs):

  1. `main.tf`
  2. `variables.tf`
  3. `outputs.tf`
  4. `providers.tf`

- **AI cue:**
  “When generating or modifying deployment scripts, refer to `infra/`.”

---

## 4. `local/` Directory

- **What it is:**
  Local development Docker Compose setup (named “local” rather than “compose”).
- **Why it exists:**
  Lets developers spin up the app (and any dependencies) locally. The folder name is customizable (and defined in `meta.json`), but most apps use `local/` by convention.
- **AI cue:**
  “For local environment definitions, use the folder indicated under `compose` in `meta.json` (commonly `local/`).”

---

## 5. `scripts/` Directory

- **What it is:**
  Helper scripts, written in Deno.
- **Why it exists:**
  Houses various one-off or CI/CD scripts. All scripts are TypeScript files that export a default function; our tool invokes these via `run` commands.
- **AI cue:**
  “When automating tasks or creating scripts, look in the directory named under `scriptsDir` in `meta.json` (commonly `scripts/`).”

---

## Required Root Files

At the root of each app folder (e.g., `my-app/`), the following files must exist:

1. **`.env.template`**

   - **What it is:** Template listing all environment variables the app expects.
   - **Why it exists:** Ensures consistency; developers copy this to `.env` locally and fill in real values.

2. **`README.md`**

   - **What it is:** High-level instructions and description for the app.
   - **Why it exists:** Gives a quick overview: what the app does, how to get started (e.g., run locally, deploy), and where to find deeper docs.

3. **`meta.json`**

   - **What it is:** Metadata file for our automation framework and AI agent.
   - **What it does:** Specifies key properties that define different entry points and folder names. For example, it may contain objects or&#x20;
   - **Why it exists:** When processed by the AI or automation tool, `meta.json` tells it exactly where and how to locate each piece (Docker contexts, local definitions, infra folders, script locations), even if an app uses a custom structure.
   - **AI cue:**
     “Read `meta.json` to understand which folders/names correspond to Docker, local, infra, and scripts for this app.”

---

---

## `meta.json` Schema (JSON Schema Reference)

Below is the JSON Schema (`schema.json`) that defines the structure for `meta.json`. This shows all possible fields, types, and descriptions. An AI agent or developer can use this schema to validate or generate a correct `meta.json` for any application.

meta.json ://github.com/ghostmind-dev/config/blob/main/config/meta/schema.jsom

✧ This schema helps the AI validate or generate a correct `meta.json` according to your project’s conventions. ✧
