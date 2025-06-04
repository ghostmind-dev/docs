## Container Build Guide - Docker Pattern

This guide tells an AI **exactly** what to do when implementing the **Docker Pattern**—creating container build definitions within the standardized directory structure. This is one of the five core patterns (app, docker, infra, local, scripts) defined in our system.

**📄 Base Reference:** [base.md](https://github.com/ghostmind-dev/docs/blob/main/docs/app/base.md)

> 🧠 **IMPORTANT:** The AI must read and understand `base.md` first to learn about all five directory patterns, then return here for specific Docker Pattern implementation details.

**📍 Pattern Focus:** This document covers the `docker/` directory pattern only. For other patterns, refer to their respective documentation.

---

### What is the Docker Pattern?

The **Docker Pattern** is responsible for building the container images used to run the application. All Docker-related build definitions, configuration, and supporting files live under the `docker/` directory at the root of your pattern folder.

**ALWAYS use the standard structure for the `docker/` folder.** This is critical to ensure compatibility with our compose and deployment tooling.

---

### Directory Structure

Your Docker pattern **must** follow this structure:

```
/
├─ docker/
│  ├─ Dockerfile
│  ├─ <supporting files, if any>
```

- The main `Dockerfile` always lives inside `docker/`.
- If your build needs additional files (e.g. scripts, configs), put them in the same `docker/` folder.

---

### 🚨 CRITICAL: Build Context and File Paths

**This is the most common source of Docker build failures.** Pay close attention to the build context configuration in `meta.json`:

#### Understanding context_dir in meta.json

The `context_dir` setting in your `meta.json` determines the Docker build context and is **REQUIRED**:

```json
"docker": {
  "default": {
    "root": "docker",
    "image": "gcr.io/ghostmind-core/app-name",
    "env_based": false,
    "context_dir": "app"  // REQUIRED: This sets build context to app/ directory
  }
}
```

#### Impact on Dockerfile COPY Commands

**If `context_dir` is set to `"app"`:**

- Build context is the `app/` directory
- COPY commands are relative to the `app/` directory
- Use: `COPY go.mod go.sum ./` (NOT `COPY app/go.mod app/go.sum ./`)
- Use: `COPY src/ ./src/` (NOT `COPY app/src/ ./src/`)

**If `context_dir` is set to `"."`** (project root):

- Build context is the project root directory
- COPY commands are relative to the project root
- Use: `COPY app/go.mod app/go.sum ./`
- Use: `COPY app/src/ ./src/`

#### Common Error Pattern

❌ **WRONG:** When `context_dir: "app"` is set but Dockerfile uses:

```dockerfile
COPY app/go.mod app/go.sum ./  # Fails: looks for app/app/go.mod
COPY app/src/ ./src/           # Fails: looks for app/app/src/
```

✅ **CORRECT:** When `context_dir: "app"` is set, use:

```dockerfile
COPY go.mod go.sum ./          # Correct: looks for app/go.mod
COPY src/ ./src/               # Correct: looks for app/src/
```

#### Quick Debug Steps

If you get "file not found" errors during Docker build:

1. Verify the required `context_dir` setting in `meta.json`
2. Ensure your COPY commands match the build context
3. Remember: paths in Dockerfile are relative to the build context, not the Dockerfile location

---

### Naming and Image Tagging

When defining the Docker image in `meta.json`, always use the following naming convention for the image URL:

```
gcr.io/ghostmind-core/APP_NAME
```

- Replace `APP_NAME` with the folder or service name as required.

**Example meta.json Docker block:**

```json
"docker": {
  "default": {
    "root": "docker",
    "image": "gcr.io/ghostmind-core/potion-state",
    "env_based": false,
    "context_dir": "app"
  }
}
```

- `root` must always be set to `"docker"`.
- `image` must always use the Google Container Registry (GCR) base: `gcr.io/ghostmind-core/APP_NAME`.
- Set `env_based` to `true` or `false` as appropriate (default is `false` unless environment-specific images are needed).
- `context_dir` is **REQUIRED** and determines how COPY commands work (see Build Context section above).

**Note:**
After you finish creating the `docker/` directory and its contents, you **must update the `meta.json`** with the correct Docker block.

---

### Requirements & Guidelines

- **DO NOT** place application code here. Only include what's required to build the container.
- Reference the app's build context using relative paths if needed.
- **Do not** modify or move files outside the `docker/` directory.
- The Dockerfile should be optimized for build caching and small image size where possible.
- **ALWAYS** check the `context_dir` setting in `meta.json` before writing COPY commands.

---

### Integration with Compose

By following this directory and naming pattern, your Docker images can be easily referenced in compose files and deployed to Cloud Run or other GCP services.
All Compose and deployment logic assumes the image and `docker/` structure described above.

---

### Final Checklist

1. Create the `docker/` folder at the root if not present.
2. Add your `Dockerfile` and any supporting files inside `docker/`.
3. Set the correct image name in `meta.json` using the format: `gcr.io/ghostmind-core/APP_NAME`.
4. Make sure `root` is `"docker"` in the Docker block.
5. **🚨 CRITICAL:** Set the required `context_dir` property in `meta.json` and adjust COPY commands accordingly.
6. Test your Docker build to ensure file paths are correct.
7. Do **not** touch code or files outside of `docker/` for this pattern.
8. Refer back to [`base.md`](https://github.com/ghostmind-dev/docs/blob/main/docs/app/base.md) if unsure.

---

**Next Steps:**
Once the Docker pattern is implemented, the next pattern can be handled by referencing the relevant documentation for infra, app, local, or scripts as needed.

---

Let me know if you want tweaks, more technical detail, code examples, or an even more AI-instructional voice!
