Okay, I've processed the documentation you provided. Here's a compressed guide tailored for an AI to quickly understand how to build automation scripts using the Ghostmind **Scripts Pattern**. This guide focuses on the `scripts/` directory and the `run script` command.

## AI Guide to Ghostmind Scripts Pattern

This guide enables an AI to construct automation scripts for the Ghostmind system, specifically focusing on the `scripts/` pattern and the `run script` command. For broader system context, including other directory patterns, the `base.md` document should be consulted.

**1. Core Concept & Invocation:**

- **Goal:** Execute custom TypeScript automation scripts within a Ghostmind project using the Deno runtime.
- **Command:** `run script <scriptName> [args...]`
  - `<scriptName>` is the name of your TypeScript file (without the `.ts` extension).
  - `[args...]` are optional positional command-line arguments passed to your script.
- **Location:** Scripts are TypeScript files (e.g., `myTask.ts`) typically located in the `<projectRoot>/scripts/` directory. This path can be configured in `meta.json` or overridden with the `--root <dir>` CLI option.

**2. Script File Essentials:**

- Each script **MUST** be a TypeScript file (e.g., `scripts/deploy.ts`).
- Each script **MUST** export a `default async function`. This function is the entry point called by the runner.
- **Signature:**

  ```typescript
  // Example: scripts/myTask.ts
  import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
  // import { $ } from 'npm:zx'; // If shell commands are needed
  // import { someUtil } from 'jsr:@ghostmind/run'; // If specific Ghostmind utils are directly imported

  export default async function main(args: string[], opts: CustomOptions) {
    // --- Your script logic begins here ---

    // Access positional arguments:
    const firstArg = args[0];

    // Access injected utilities and context via opts:
    const apiKey = opts.env['API_KEY'];
    if (opts.has('verbose')) {
      console.log('Verbose mode enabled.');
    }
    const environment = opts.extract('env') || 'development';

    // --- Your script logic ends here ---
  }
  ```

  - **`args: string[]`**: An array of positional string arguments passed to the script from the command line. (Note: Examples sometimes use the type alias `CustomArgs` from `jsr:@ghostmind/run` for this parameter, which is equivalent to `string[]`).
  - **`opts: CustomOptions`**: An object containing injected runtime utilities, helper functions, environment information, and project context.

**3. Understanding `CustomOptions` (the `opts` object):**

The `opts` object is the primary interface for the script to interact with the Ghostmind runtime and project environment.

| Property      | Type                                             | Description & Typical Usage                                                                                                                                                                                                                                                  |
| :------------ | :----------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `env`         | `Record<string,string>`                          | A snapshot of environment variables at script invocation. Access like `opts.env['MY_VARIABLE']`.                                                                                                                                                                             |
| `currentPath` | `string`                                         | The absolute working directory path from where the script was initiated.                                                                                                                                                                                                     |
| `metaConfig`  | `any`                                            | The parsed content of the project's `meta.json` file, with environment placeholders expanded. Use for project-specific settings.                                                                                                                                             |
| `run`         | `string`                                         | The file path to the Ghostmind `run` CLI entry point. Useful for invoking other `run` commands as subprocesses: `await $`${opts.run} another-command`;`.                                                                                                                     |
| `main`        | `object`                                         | Provides programmatic access to all Ghostmind Run commands (e.g., `dockerRegister`, `terraformActivate`). Prefer using `opts.main.commandName()` over shelling out to `opts.run` for these internal operations. Example: `await opts.main.dockerRegister({ amd64: true });`. |
| `cmd`         | `(...args: (string \| undefined)[]) => string[]` | A helper function to build safe command argument arrays, especially for complex shell commands. Example: `const argsArray = opts.cmd('ls', '-l', maybeUndefinedPath); await $`${argsArray}`;`.                                                                               |
| `extract`     | `(name: string) => string \| undefined`          | Retrieves the value of a named command-line argument (e.g., if `env=prod` is passed, `opts.extract('env')` returns `"prod"`).                                                                                                                                                |
| `has`         | `(flag: string) => boolean`                      | Checks for the presence of a standalone flag in the command-line arguments (e.g., if `--force` is passed, `opts.has('force')` returns `true`).                                                                                                                               |
| `start`       | `(config: StartConfig) => Promise<void>`         | A powerful utility to orchestrate and run multiple tasks, managing their execution order and concurrency. See Section 5.                                                                                                                                                     |

**4. Handling Command-Line Arguments:**

- **Positional Arguments:** Directly use the `args: string[]` array passed to the `main` function.
  - Example: `const [sourceFile, destinationFile] = args;`
- **Named Arguments (`name=value` format):** Use `opts.extract('argumentName')`.
  - Example: `const environment = opts.extract('env') ?? 'development';`
- **Flags (`--flagName` format):** Use `opts.has('flagName')`.
  - Example: `if (opts.has('dry-run')) { console.log('Performing a dry run.'); }`

**5. Orchestrating Tasks with `opts.start`:**

`opts.start` allows defining and running a sequence of operations, which can be shell commands, asynchronous JavaScript functions, or pre-defined Ghostmind utilities.

- **Structure:**
  ```typescript
  await opts.start({
    taskName1: { command: /* string, function, or imported util */, priority: 10, options: { /* ... */ } },
    taskName2: "echo 'Another task'", // Shell command
    taskName3: async () => { /* custom async logic */ }, // Async function
    // ... more tasks
  });
  ```
- **Task Definition Forms:**
  1.  **String:** Interpreted as a shell command.
  2.  **Async Function:** A direct JavaScript async function to execute.
  3.  **Object:**
      - `command`: The shell command (string), async function, or an imported utility (e.g., `dockerComposeUp` from `jsr:@ghostmind/run`).
      - `priority` (optional): A number determining execution order. Lower numbers run first. Tasks with the same priority run **concurrently**.
      - `options` (optional): An object passed as arguments if the `command` is a function.
      - `variables` (optional, alternative to `options`): Similar to `options`.
- **Execution Control:** If the script is called with arguments that match task names (e.g., `run script mySetupTask taskName1`), only those tasks will run. If called with `--all` (e.g., `run script mySetupTask --all`), all defined tasks in the `start` configuration will execute according to their priorities.

**6. Common Imports & Tools:**

- **Core Types:** `import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';`
- **Shell Operations (`zx`):** `import { $ } from 'npm:zx';`
  - Enables intuitive shell command execution: `await $`echo Hello World`;`.
  - Provides utilities like `cd()`, `fs` (file system operations).
  - Set `$.verbose = true;` for detailed shell output.
- **Specific Ghostmind Utilities:** For direct usage, import from `jsr:@ghostmind/run` (e.g., `import { dockerRegister, terraformActivate } from 'jsr:@ghostmind/run';`). These are often also available via `opts.main`.
- **Node.js Built-in Modules:** `import fs from 'node:fs';`, `import path from 'node:path';` for file system and path manipulations if `zx`'s `fs` is not preferred.
- **HTTP Requests:** `fetch` is globally available in Deno. For specific needs, `npm:node-fetch` can be imported.

**7. Key Patterns & Capabilities (for AI to generate diverse scripts):**

- **Executing Shell Commands:** Use `$` from `npm:zx`. Example: `await $`npm install`;`.
- **Running Other Ghostmind CLI Commands:** Use `opts.run`. Example: `await $`${opts.run} infra deploy --component api`;`.
- **Using Internal Ghostmind Functions:** Prefer `opts.main` for built-in operations. Example: `await opts.main.dockerComposeBuild({ services: ['api'] });`.
- **File System Operations:** Use `fs` from `npm:zx` or `node:fs` for reading, writing, checking existence, etc.
- **API Interactions:** Use `fetch` or specific SDKs (e.g., `npm:openai`, `npm:@google-cloud/storage`) for external services. Credentials often come from `opts.env`.
- **Conditional Logic:** Implement different behaviors based on `opts.has()`, `opts.extract()`, or `args` values.
- **Docker Management:** Build/push images (`opts.main.dockerRegister`), manage compose (`opts.main.dockerComposeUp`, `dockerComposeBuild`).
- **Infrastructure Management:** Use `opts.main.terraformActivate` for Terraform operations.
- **Data Processing:** Read/parse JSON/YAML, transform data, interact with databases.
- **Task Orchestration:** Use `opts.start` for multi-step processes like:
  - Build -> Test -> Deploy sequences.
  - Parallel initialization of services.
  - Data preparation and upload pipelines.

**8. Best Practices for AI Script Generation:**

1.  **Refer to `opts.metaConfig`:** For project-specific configurations instead of hardcoding values.
2.  **Use `zx` for Shell Commands:** For clarity, error handling, and ease of use (`import { $ } from 'npm:zx';`).
3.  **Prefer `opts.main`:** For invoking internal Ghostmind functionality over constructing `opts.run` subprocess calls.
4.  **Validate Arguments:** Check for required `args`, `opts.extract()` values early and provide clear error messages if invalid.
5.  **Avoid `Deno.exit()`:** Let the `main` function resolve or reject. The runner handles process exiting.
6.  **Manage Concurrency:** Be mindful of potential race conditions when tasks in `opts.start` have the same priority.
7.  **Idempotency:** Where practical, design scripts so they can be run multiple times with the same outcome.
8.  **Clear Logging:** Use `console.log` or other logging mechanisms to output status and errors.

By following this compressed guide, an AI should be well-equipped to understand the capabilities of the Ghostmind Scripts Pattern and generate effective automation scripts.
