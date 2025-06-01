## Application Package Structure Guide

This guide instructs an AI how to scaffold a _single_ application package for local execution. It complements the overarching principles defined in the base documentation:

**📄 Base Reference:** [base.md](https://github.com/ghostmind-dev/docs/blob/main/docs/app/base.md)

> 🧠 **IMPORTANT:** Read and understand `base.md` **before** generating any files. Everything below assumes that structure.

---

## 📁 Folder Context

Assume you are already _inside_ the application’s root directory (the folder is already named, e.g., `my-cool-app`). Within this directory you must create **exactly four items**:

```
/ (current directory)
├── meta.json        # minimal metadata (id, name, type)
├── .env.template    # blueprint for environment variables
├── README.md        # setup & usage instructions
└── app/             # contains the runnable application code
    └── src/         # (mandatory) source code lives here
```

No Docker, CI/CD, or infrastructure files belong here—only what is required to run the application locally.

---

### 1. `meta.json`

_Minimal metadata for this app._

- **Schema reference:**

  ```
  https://raw.githubusercontent.com/ghostmind-dev/config/refs/heads/main/config/meta/schema.json
  ```

- **Required fields only:**

  ```jsonc
  {
    "id": "<12‑char hex>",
    "name": "<app name>",
    "type": "<app category>"
  }
  ```

- **Do NOT** include any other keys (`global`, `version`, `compose`, etc.).

### 2. `.env.template`

_Lists every environment variable the app expects._

```
# Example
DATABASE_URL=
API_KEY=
```

- Leave values blank—just define the keys.
- This file is copied/renamed to `.env` in each environment.

### 3. `README.md`

_Human‑readable instructions._

Recommended sections:

1. **Project Overview** – one‑liner about the app.
2. **Prerequisites** – language version, package manager, etc.
3. **Installation** – commands like `npm install` / `pip install -r requirements.txt`.
4. **Environment Variables** – reference `.env.template`.
5. **Running Locally** – `npm start`, `python -m app`, etc.
6. **Testing** – how to run unit/integration tests.

### 4. `app/` subfolder

_The runnable codebase._

At minimum:

- `src/` directory (mandatory) with your entry point (`index.js`, `main.py`, etc.).
- Runtime manifest such as `package.json`, `pyproject.toml`, or `requirements.txt`.

Feel free to add other code files under `app/` as needed, but **do not** place additional configuration or infra artifacts here.

---

## 🚧 Implementation Notes for the AI

- Validate `meta.json` against the schema **for the three required fields only**.
- Ensure `.env.template`, `README.md`, and `app/` with `src/` exist before adding more logic.
- Skip Docker/CI configuration entirely at this stage.

---

### ✅ Next Step

1. Parse `base.md`.
2. Generate the skeleton above in the current directory.
3. Populate placeholder files as described (empty values in `.env.template`, minimal `README.md`, etc.).
4. Return success or any validation errors.
