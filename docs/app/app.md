## Application Code Generation Guide - App Pattern

This guide tells an AI **exactly** what to do when implementing the **App Pattern** - scaffolding application code within the standardized directory structure. This is one of the five core patterns (app, docker, infra, local, scripts) defined in our system.

**📄 Base Reference:** [base.md](https://github.com/ghostmind-dev/docs/blob/main/docs/app/base.md)

> 🧠 **IMPORTANT:** The AI must read and understand `base.md` first to learn about all five directory patterns, then return here for specific App Pattern implementation details.

**📍 Pattern Focus:** This document covers the `app/` directory pattern only. For other patterns, refer to their respective documentation.

---

### 📁 Directory Layout (pre‑existing)

```
/ (current directory = app root)
├── meta.json        # already exists – DO NOT touch
├── .env.template    # exists – append variables if needed
├── README.md        # exists – AI should not overwrite
└── app/             # where the runnable code will live
```

---

## 🎯 AI Responsibilities

1. **Generate Application Code inside `app/`**

   - Create the necessary runtime manifest (`package.json`, `pyproject.toml`, etc.) and a `src/` folder with an entry point (`index.js`, `main.py`, etc.).
   - Follow the runtime the user requests (Node.js, Python, etc.).

2. **Modify `.env.template` _only_ if new environment variables are required**

   - Append **new** variable keys (leave values blank).
   - Do **not** remove or rename existing keys.
   - Example addition:

     ```
     # Added by AI for JWT secret
     JWT_SECRET=
     ```

3. **Leave `meta.json` and `README.md` untouched.**
4. **No Docker / CI / infra files** at this stage.

---

### 📝 Workflow for the AI

1. Parse `base.md` for global conventions.
2. Interpret the user's description of the desired application.

   - Determine language & minimal dependencies.
   - Scaffold code under `app/` accordingly.

3. While generating code, keep a list of any configuration values that should come from the environment.

   - After code generation, append those keys to `.env.template` (one per line, with comments if helpful).

4. Output a summary of actions:

   - Created/updated files.
   - Variables appended to `.env.template` (if any).

---

## ✅ Completion Checklist

- [ ] `app/` exists and contains runnable code (with `src/`, manifest, and entry point).
- [ ] `.env.template` updated **only** with new variable keys (values remain blank).
- [ ] `meta.json` and `README.md` remain unchanged.
- [ ] No Docker/infra artifacts created.
- [ ] AI returns a concise summary of what was done and any next steps for the user.

---

_End of guide_
