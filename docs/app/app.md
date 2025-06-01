## Application Code Generation Guide - App Pattern

This guide tells an AI **exactly** what to do when implementing the **App Pattern** - scaffolding application code within the standardized directory structure. This is one of the five core patterns (app, docker, infra, local, scripts) defined in our system.

**📄 Base Reference:** [base.md](https://github.com/ghostmind-dev/docs/blob/main/docs/app/base.md)

> 🧠 **IMPORTANT:** The AI must read and understand `base.md` first to learn about all five directory patterns, then return here for specific App Pattern implementation details.

**📍 Pattern Focus:** This document covers the `app/` directory pattern only. For other patterns, refer to their respective documentation.

---

### 📁 App Pattern Directory Layout

```
/ (current directory = app root)
└── app/             # where the runnable code will live
    ├── README.md    # application-specific documentation
    ├── src/         # source code
    │   └── index.js # entry point (example for Node.js)
    └── package.json # runtime manifest (example for Node.js)
```

---

## 🎯 AI Responsibilities

1. **Generate Application Code inside `app/`**

   - Create the necessary runtime manifest (`package.json`, `pyproject.toml`, etc.) and a `src/` folder with an entry point (`index.js`, `main.py`, etc.).
   - Follow the runtime the user requests (Node.js, Python, etc.).

2. **Create a README.md inside the `app/` folder**

   - Document what the application does
   - Include setup and running instructions
   - If the application requires environment variables, list them clearly in this README
   - The user will handle environment setup manually

---

### 📝 Workflow for the AI

1. Parse `base.md` for global conventions.
2. Interpret the user's description of the desired application.

   - Determine language & minimal dependencies.
   - Scaffold code under `app/` accordingly.

3. Create a comprehensive `app/README.md` that includes:

   - Application description
   - Setup instructions
   - Running instructions
   - Any required environment variables (if applicable)

4. Output a summary of actions taken.

---

## ✅ Completion Checklist

- [ ] `app/` exists and contains runnable code (with `src/`, manifest, and entry point).
- [ ] `app/README.md` created with application documentation and any required environment variables listed.
- [ ] AI returns a concise summary of what was created.

---

_End of guide_
