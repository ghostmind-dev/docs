## Custom Scripting Guide - Scripts Pattern

> 🦕 **CRITICAL: DENO RUNTIME DISCLAIMER**  
> **These are DENO scripts, NOT Node.js scripts!** All examples, imports, and APIs in this guide are specifically designed for the Deno runtime. Key differences:
>
> - Use `import` from URLs (JSR/npm: prefixes) instead of npm package.json dependencies
> - Use Deno's built-in APIs (`Deno.readTextFile`, `Deno.env`, etc.) instead of Node.js equivalents
> - File system operations use Deno's permissions model
> - No `require()` - only ES modules with `import`
> - Different standard library and runtime APIs

This guide tells an AI **exactly** what to do when implementing the **Scripts Pattern** - creating custom, automated Deno scripts within the standardized directory structure. This is one of the five core patterns (app, docker, infra, local, scripts) defined in our system.

**📄 Base Reference:** [base.md](https://github.com/ghostmind-dev/docs/blob/main/docs/app/base.md)

> 🧠 **IMPORTANT:** The AI must read and understand `base.md` first to learn about all five directory patterns, then return here for specific Scripts Pattern implementation details.

**📍 Pattern Focus:** This document covers the `scripts/` directory pattern only. For other patterns, refer to their respective documentation.

---

## 1. Purpose

The `scripts/` directory contains custom TypeScript modules that automate complex, repeatable, or project-specific tasks. These scripts are executed by the `run custom` command, which injects a rich execution context, providing access to environment variables, project metadata, and powerful helper utilities.

The goal is to centralize and standardize automation, from simple build commands to intricate multi-step deployment workflows.

## 2. Script Anatomy

A custom script is a Deno TypeScript module that must export a `default async function`. This function is the script's entry point.

- **Location:** Scripts are typically placed in the `scripts/` directory, as defined by the `scriptsDir` property in `meta.json`.
- **Entry Point:** The file must contain `export default async function(args, opts) { ... }`.
- **Type Safety:** For proper type checking and autocompletion, import the core types from the `run` toolkit.
- **Runtime:** These scripts run in Deno, not Node.js - use Deno APIs and import syntax.

**Basic Structure:**

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

export default async function (args: CustomArgs, opts: CustomOptions) {
  console.log('Custom script has started.');
  console.log(`Running in: ${opts.currentPath}`);

  if (opts.has('verbose')) {
    $.verbose = true;
  }

  await $`echo "Script finished."`;
}
```

### 🦕 Deno-Specific Considerations

When writing custom scripts, remember these Deno-specific patterns:

**File System Operations:**

```typescript
// ✅ DENO: Use Deno's built-in file APIs
const content = await Deno.readTextFile('./config.json');
await Deno.writeTextFile('./output.txt', data);

// ❌ NODE.JS: Don't use Node.js fs module
// const fs = require('fs'); // This won't work in Deno
```

**Environment Variables:**

```typescript
// ✅ DENO: Use Deno.env or opts.env
const apiKey = Deno.env.get('API_KEY') || opts.env['API_KEY'];

// ❌ NODE.JS: Don't use process.env directly
// const apiKey = process.env.API_KEY; // This won't work in Deno
```

**Imports:**

```typescript
// ✅ DENO: Use JSR and npm: prefixes for external modules
import { $ } from 'npm:zx';
import { serve } from 'jsr:@std/http';

// ❌ NODE.JS: Don't use bare imports without prefixes
// import zx from 'zx'; // This won't work in Deno
```

**Permissions:**
Deno scripts may require explicit permissions when run:

```bash
# The run command handles permissions, but if running directly:
deno run --allow-read --allow-write --allow-net --allow-run script.ts
```

## 3. Execution from the Command Line

Custom scripts are invoked using the `run custom` command.

**Format:**
`run custom <script_name> [arguments...] [--flags]`

- `<script_name>`: The name of the TypeScript file in the `scripts/` directory (without the `.ts` extension).
- `[arguments...]`: Space-separated arguments passed to the `args` array. These can be commands, targets, or any other positional parameters.
- `[--flags]`: Boolean flags checked using `opts.has('flag_name')` or extracted using `opts.extract('key')`.

**Example:**
`run custom deploy-service api production --target=staging --verbose`

- `args[0]` = `'api'`
- `args[1]` = `'production'`
- `opts.has('verbose')` = `true`
- `opts.extract('target')` = `'staging'`

## 4. Injected Parameters

The `default` function receives two parameters: `args` and `opts`.

### `args: CustomArgs`

An array containing all arguments passed after the script name. Even if only one argument is provided, it will be returned as an array. Many scripts access the first argument with `args[0]` or use specific array indices for different arguments.

**CLI:** `run custom my-script setup production --verbose`
**Script:**

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const command = args[0]; // 'setup'
  const environment = args[1]; // 'production'

  if (command === 'setup') {
    console.log(`Setting up for ${environment} environment`);
  }
}
```

**Note:** Many examples in the codebase use `_arg` when the argument is not needed, or destructure specific indices like `args[0]`.

### `opts: CustomOptions`

A powerful object containing the script's execution context, environment data, and a suite of helper utilities.

---

## 5. Deep Dive into `opts: CustomOptions`

The `opts` object is the key to unlocking the power of custom scripts. Here are its properties:

### `opts.currentPath: string`

The absolute path to the directory from which the `run` command was invoked.

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import fs from 'node:fs';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const packageJsonPath = `${opts.currentPath}/package.json`;
  const content = fs.readFileSync(packageJsonPath, 'utf8');
}
```

### `opts.input: string[]`

An array containing additional input data that may be passed to the script. This is often used for data that needs to be processed by the script, separate from command-line arguments. The exact population of this array depends on how the script is invoked and the specific `run` implementation.

**Script:**

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  // Access input data if provided
  const inputData = opts.input?.[0]; // First input item
  if (inputData) {
    console.log(`Processing input: ${inputData}`);
  }
}
```

**Note:** In practice, most scripts rely on `args` for command-line arguments and use `opts.input` for specific data inputs when needed.

### `opts.env: Record<string, string | undefined>`

An object containing the environment variables available to the script.

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const apiKey = opts.env['API_KEY'];
  if (!apiKey) {
    throw new Error('API_KEY environment variable is not set.');
  }
}
```

### `opts.has(key: string): boolean`

A function to check for the presence of a command-line flag or argument.

**CLI:** `run custom my-script --verbose --force`
**Script:**

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  if (opts.has('verbose')) {
    console.log('Verbose mode is on.');
  }
  if (opts.has('force')) {
    // ... proceed without asking for confirmation
  }
}
```

### `opts.extract(key: string): any`

A function to extract a named argument, typically from a `--key=value` or `--key value` format.

**CLI:** `run custom upload --model=llama3`
**Script:**

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const modelName = opts.extract('model'); // "llama3"
  console.log(`Using model: ${modelName}`);
}
```

### `opts.start(tasks: object): Promise<void>`

A powerful task runner for orchestrating multiple operations. It takes an object where keys are task names and values define the command, priority, and options. Tasks can run in `parallel` or `sequence` (the default behavior depends on the runner's implementation, but priorities enforce order).

- `command`: An `async` function or a shell command string.
- `priority`: A number; lower numbers execute first.
- `options`: An object passed as an argument to the `command` function.

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

async function buildComponent(options: { name: string }) {
  console.log(`Building ${options.name}...`);
}

export default async function (args: CustomArgs, opts: CustomOptions) {
  await opts.start({
    build_ui: {
      command: 'npm run build --prefix ./ui',
      priority: 1,
    },
    build_api: {
      command: () => buildComponent({ name: 'api' }),
      priority: 1,
      options: { name: 'api' },
    },
    deploy: {
      command: 'gcloud run deploy...',
      priority: 2,
    },
  });
}
```

### `opts.run: string`

The path to the `run` executable itself. This is used to chain `run` commands programmatically within a script.

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const { run } = opts;
  // Calls another run command, e.g., 'run terraform activate ...'
  await $`${run} terraform activate core --arch=amd64`;
}
```

### `opts.main: object`

An object providing access to core `run` functionalities. This is an alternative to importing them directly.

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
// Direct import is also common and often preferred
import { dockerRegister } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  // Using opts.main
  const { dockerRegister: mainDockerRegister, terraformActivate } = opts.main;
  await mainDockerRegister({ amd64: true });

  // Or using direct import (preferred)
  await dockerRegister({ amd64: true });
}
```

### `opts.url: object`

An object containing relevant URLs for the current environment, such as for local services or tunnels.

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const { docker, tunnel, local } = opts.url;
  const response = await fetch(`${local}:${opts.port}/health`);
}
```

### `opts.port: number`

The port number for a local service, often used with `opts.url.local`.

### `opts.metaConfig: MetaJson`

The parsed `meta.json` configuration object for the current project, providing access to comprehensive project metadata and configuration.

#### Complete meta.json Structure

```typescript
// Base required fields
interface MetaJsonBase {
  id: string; // Required: 12-character hexadecimal string
  name: string; // Required: Project/app name
}

// Complete meta.json schema (matches official schema.json)
interface MetaJson extends MetaJsonBase {
  // Optional core fields
  version?: string; // Project version
  description?: string; // Project description
  type?: 'app' | 'project' | 'template'; // Project type enum
  global?: boolean; // Whether project is global
  port?: number; // Default port for the application
  tags?: string[]; // Tags for project categorization

  // Custom scripts configuration
  custom?: {
    root: string; // Path to the scripts folder
  };

  // Docker configuration
  docker?: {
    [componentName: string]: {
      root: string; // Path to Dockerfile directory
      image: string; // Docker image name
      env_based?: boolean; // Whether to use environment-based configuration
      context_dir?: string; // Docker build context directory
      tag_modifiers?: string[]; // Additional tags to apply
    };
  };

  // Docker Compose configuration
  compose?: {
    [composeName: string]: {
      root: string; // Path to compose file directory
      filename?: string; // Custom compose filename (default: docker-compose.yml)
    };
  };

  // Terraform infrastructure
  terraform?: {
    [componentName: string]: {
      path: string; // Path to Terraform configuration
      global: boolean; // Whether component is globally shared
      containers?: string[]; // List of containers to be used
    };
  };

  // Custom routines (npm-style scripts)
  routines?: {
    [routineName: string]: string; // Command to execute
  };

  // Secrets management
  secrets?: {
    base: string; // Base path for secrets/environment variables file
  };

  // Tunneling configuration for local development
  tunnel?: {
    [tunnelName: string]: {
      hostname: string; // Hostname for the tunnel (example: example.com)
      service: string; // Local service to be tunneled (example: localhost:8080)
    };
  };

  // MCP (Model Context Protocol) servers - supports two types
  mcp?: {
    [serverName: string]:
      | {
          // Command-based MCP server
          command: string; // Required: Command to start server
          args?: string[]; // Command arguments
          env?: Record<string, any>; // Environment variables
        }
      | {
          // URL-based MCP server
          url: string; // Required: Server URL
          headers?: Record<string, string>; // HTTP headers
        };
  };

  // Template-specific configuration
  template?: {
    [templateName: string]: {
      ignoreFolders?: string[]; // Folders to ignore when copying template
      ignoreFiles?: string[]; // Files to ignore when copying template
      init?: string[]; // Commands to run after template initialization
    };
  };
}
```

#### Usage Examples

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const { metaConfig } = opts;

  if (!metaConfig) {
    throw new Error('No meta.json configuration found');
  }

  // Basic project information
  console.log(`Project: ${metaConfig.name}`);
  console.log(`ID: ${metaConfig.id}`);
  console.log(`Type: ${metaConfig.type || 'undefined'}`);
  console.log(`Version: ${metaConfig.version || 'undefined'}`);
  console.log(`Global: ${metaConfig.global || false}`);

  // Access Docker configuration
  if (metaConfig.docker) {
    Object.entries(metaConfig.docker).forEach(([name, config]) => {
      console.log(`Docker component: ${name}`);
      console.log(`  Image: ${config.image}`);
      console.log(`  Root: ${config.root}`);
      console.log(`  Context: ${config.context_dir || 'same as root'}`);
      console.log(
        `  Tag modifiers: ${config.tag_modifiers?.join(', ') || 'none'}`
      );
    });
  }

  // Access Compose configuration
  if (metaConfig.compose) {
    Object.entries(metaConfig.compose).forEach(([name, config]) => {
      console.log(`Compose service: ${name}`);
      console.log(`  Root: ${config.root}`);
      console.log(`  Filename: ${config.filename || 'docker-compose.yml'}`);
    });
  }

  // Access Terraform configuration
  if (metaConfig.terraform) {
    Object.entries(metaConfig.terraform).forEach(([name, config]) => {
      console.log(`Terraform component: ${name}`);
      console.log(`  Path: ${config.path}`);
      console.log(`  Global: ${config.global}`);
      console.log(`  Containers: ${config.containers?.join(', ') || 'none'}`);
    });
  }

  // Access custom scripts configuration
  if (metaConfig.custom) {
    console.log(`Custom scripts root: ${metaConfig.custom.root}`);
  }

  // Use port configuration
  const port = metaConfig.port || 3000;
  console.log(`Default port: ${port}`);

  // Access custom routines
  if (metaConfig.routines) {
    console.log('Available routines:');
    Object.entries(metaConfig.routines).forEach(([name, command]) => {
      console.log(`  ${name}: ${command}`);
    });
  }

  // Access MCP servers
  if (metaConfig.mcp) {
    Object.entries(metaConfig.mcp).forEach(([name, config]) => {
      if ('command' in config) {
        console.log(`MCP server ${name} (command): ${config.command}`);
      } else {
        console.log(`MCP server ${name} (URL): ${config.url}`);
      }
    });
  }

  // Access tunnel configuration
  if (metaConfig.tunnel) {
    Object.entries(metaConfig.tunnel).forEach(([name, config]) => {
      console.log(`Tunnel ${name}: ${config.hostname} -> ${config.service}`);
    });
  }

  // Access template configuration
  if (metaConfig.template) {
    Object.entries(metaConfig.template).forEach(([name, config]) => {
      console.log(`Template ${name}:`);
      console.log(
        `  Ignore folders: ${config.ignoreFolders?.join(', ') || 'none'}`
      );
      console.log(
        `  Ignore files: ${config.ignoreFiles?.join(', ') || 'none'}`
      );
      console.log(`  Init commands: ${config.init?.join(', ') || 'none'}`);
    });
  }

  // Tags for categorization
  if (metaConfig.tags?.length) {
    console.log(`Tags: ${metaConfig.tags.join(', ')}`);
  }
}
```

#### Environment Variable Substitution

The `meta.json` file supports dynamic environment variable substitution:

```json
{
  "id": "abc123def456",
  "name": "${PROJECT_NAME}",
  "type": "app",
  "version": "${BUILD_VERSION}",
  "description": "My ${this.type} project: ${this.name}",
  "port": 8080,
  "tags": ["web", "api", "${ENVIRONMENT}"],
  "custom": {
    "root": "./scripts"
  },
  "docker": {
    "api": {
      "image": "${this.name}-api:${BUILD_VERSION}",
      "root": "./services/api",
      "context_dir": "./",
      "tag_modifiers": ["latest", "${ENVIRONMENT}"]
    }
  },
  "compose": {
    "development": {
      "root": "./docker",
      "filename": "docker-compose.${ENVIRONMENT}.yml"
    }
  },
  "terraform": {
    "core": {
      "path": "./terraform/core",
      "global": true,
      "containers": ["api", "ui"]
    },
    "database": {
      "path": "./terraform/database",
      "global": false
    }
  },
  "tunnel": {
    "main": {
      "hostname": "${TUNNEL_NAME}.ngrok.io",
      "service": "localhost:${this.port}"
    }
  },
  "mcp": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "PORT": "${this.port}",
        "ENV": "${ENVIRONMENT}"
      }
    }
  },
  "secrets": {
    "base": "${HOME}/.secrets/${this.name}"
  },
  "routines": {
    "dev": "npm run dev -- --port ${this.port}",
    "build": "docker build -t ${this.name}:${BUILD_VERSION} ."
  },
  "template": {
    "react-app": {
      "ignoreFolders": ["node_modules", "dist", ".git"],
      "ignoreFiles": [".env.local", "*.log"],
      "init": ["npm install", "npm run build"]
    }
  }
}
```

**Variable Resolution:**

- `${VAR}` - Environment variable
- `${this.prop}` - Reference to another property in the same meta.json
- Nested references work: `${this.docker.api.image}`
- Variables are resolved at runtime when the configuration is loaded

### `opts.utils: object`

An object containing various utility functions:

#### `opts.utils.cmd: function`

A utility for building shell commands, which can be useful for complex command construction.

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const { utils } = opts;
  const { cmd } = utils;
  const buildCmd = cmd`bun build ./src/main.ts --outdir ./dist --target node`;
  await $`${buildCmd}`;
}
```

#### `opts.utils.extract: function`

Alternative access to the extract function (also available as `opts.extract`).

#### `opts.utils.has: function`

Alternative access to the has function (also available as `opts.has`).

#### `opts.utils.start: function`

Alternative access to the start function (also available as `opts.start`).

### Complete TypeScript Interface Reference

For comprehensive type safety and intellisense, here are the complete interface definitions:

```typescript
// Core argument types
export type CustomArgs = string[];

// Environment configuration
export interface CustomOptionsEnv {
  [key: string]: string;
}

// URL configuration object
export interface CustomOptionsUrl {
  docker?: string;
  tunnel?: string;
  local?: string;
}

// Main CustomOptions interface
export interface CustomOptions {
  // Core properties
  env: CustomOptionsEnv;
  currentPath: string;
  metaConfig?: MetaJson;
  port?: number;

  // URL configuration
  url?: CustomOptionsUrl;

  // Input data array
  input?: string[];

  // Utility functions
  extract: (inputName: string) => string | undefined;
  has: (arg: string) => boolean;

  // Command building utility
  cmd: (
    template: string | TemplateStringsArray,
    ...substitutions: any[]
  ) => Promise<string[]>;

  // Task orchestration
  start: (config: CustomStartConfig) => Promise<void>;

  // Run executable path
  run?: string;

  // Main function access
  main: typeof main; // Access to core run functions

  // Alternative utility access
  utils: {
    extract: (inputName: string) => string | undefined;
    has: (arg: string) => boolean;
    cmd: (
      template: string | TemplateStringsArray,
      ...substitutions: any[]
    ) => Promise<string[]>;
    start: (config: CustomStartConfig) => Promise<void>;
  };
}

// Task configuration for opts.start()
export interface CustomStartConfig {
  [taskName: string]:
    | string // Shell command
    | CustomFunction // TypeScript function
    | CustomStartConfigCommandFunction // Function with options
    | CustomStartConfigCommandCommand; // Shell command with variables
}

// Function-based task configuration
export interface CustomStartConfigCommandFunction extends CommandOptions {
  command: CustomFunction;
  options?: any; // Passed to the function
  variables?: never; // Not used for functions
}

// String-based task configuration
export interface CustomStartConfigCommandCommand extends CommandOptions {
  command: string; // Shell command
  variables?: any; // Environment variables for command
  options?: never; // Not used for shell commands
}

// Base command options
export interface CommandOptions {
  priority?: number; // Execution priority (lower = earlier)
}

// Custom function type
export type CustomFunction = (options: any) => Promise<void>;

// Complete meta.json interface (previously documented)
export interface MetaJson extends MetaJsonBase {
  // ... (all the meta.json properties documented earlier)
}
```

### Usage with Full Type Safety

```typescript
import type {
  CustomArgs,
  CustomOptions,
  CustomStartConfig,
  MetaJson,
} from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  // Type-safe access to all properties
  const {
    env,
    currentPath,
    metaConfig,
    port,
    url,
    input,
    extract,
    has,
    cmd,
    start,
    run,
    main,
    utils,
  } = opts;

  // Type-safe meta.json access
  if (metaConfig) {
    const dockerConfig = metaConfig.docker?.['api'];
    const composeConfig = metaConfig.compose?.['development'];
    const terraformConfig = metaConfig.terraform?.['core'];
    const mcpServer = metaConfig.mcp?.['my-server'];
    const tunnelConfig = metaConfig.tunnel?.['main'];
    const portConfig = metaConfig.port || 3000;
    const projectType = metaConfig.type; // "app" | "project" | "template" | undefined

    // Access docker configuration safely
    if (dockerConfig) {
      console.log(`Docker image: ${dockerConfig.image}`);
      console.log(
        `Tag modifiers: ${dockerConfig.tag_modifiers?.join(', ') || 'none'}`
      );
    }

    // Access Terraform configuration safely
    if (terraformConfig) {
      console.log(`Terraform path: ${terraformConfig.path}`);
      console.log(`Global component: ${terraformConfig.global}`);
    }

    // Access tunnel configuration safely
    if (tunnelConfig) {
      console.log(
        `Tunnel: ${tunnelConfig.hostname} -> ${tunnelConfig.service}`
      );
    }

    // Access MCP server configuration
    if (mcpServer && 'command' in mcpServer) {
      console.log(`MCP command: ${mcpServer.command}`);
    }

    // Access custom scripts path
    const scriptsPath = metaConfig.custom?.root || './scripts';
    console.log(`Scripts directory: ${scriptsPath}`);
  }

  // Type-safe task configuration
  const taskConfig: CustomStartConfig = {
    build: {
      command: 'npm run build',
      priority: 1,
    },
    deploy: {
      command: async (options: { environment: string }) => {
        console.log(`Deploying to ${options.environment}`);
      },
      priority: 2,
      options: { environment: args[0] || 'development' },
    },
  };

  await start(taskConfig);
}
```

## 6. Core Utilities from `jsr:@ghostmind/run`

While some utilities are on `opts`, many core functions are available for direct import.

### Infrastructure Management

- **`dockerRegister(options)`**: Registers a Docker container with various options like `component`, `amd64`, `arm64`, `cloud`, `build_args`.
- **`dockerComposeBuild(options)`**: Builds Docker Compose services.
- **`dockerComposeUp(options)`**: Starts Docker Compose services with options like `forceRecreate`.
- **`terraformActivate(options)`**: Activates a Terraform component with options like `component`, `arch`.

### Utility Functions

- **`createUUID(length?: number)`**: Generates a unique ID using nanoid (default length: 12).
- **`getAppName()`** / **`getProjectName()`**: Extract project name from meta.json in current directory.
- **`setSecretsOnLocal(target: string)`**: Load and merge .env files for local development.
- **`verifyIfMetaJsonExists(path: string)`**: Load meta.json with environment variable substitution.
- **`withMetaMatching(options)`**: Find directories matching meta.json criteria.
- **`getFilesInDirectory(path: string)`**: Get files with filtering capabilities.
- **`recursiveDirectoriesDiscovery(path: string)`**: Recursive directory discovery.

### Security Utilities

- **`encrypt(text: string, key: string)`**: AES encryption for sensitive data.
- **`decrypt(encrypted: string, key: string)`**: AES decryption for sensitive data.

### Usage Examples

```typescript
import {
  dockerRegister,
  terraformActivate,
  createUUID,
  getProjectName,
  setSecretsOnLocal,
  encrypt,
  decrypt,
} from 'jsr:@ghostmind/run';

// Generate unique identifiers
const buildId = await createUUID(); // 12-character nanoid
const shortId = await createUUID(8); // 8-character nanoid

// Get project information
const projectName = await getProjectName(); // From meta.json in current directory

// Load environment secrets
await setSecretsOnLocal('.env.local'); // Merges with existing environment

// Infrastructure operations
await dockerRegister({
  component: 'api',
  amd64: true,
  arm64: false,
  build_args: [`BUILD_ID=${buildId}`, `PROJECT=${projectName}`],
});

await terraformActivate({
  component: 'core',
  arch: 'amd64',
});

// Encrypt sensitive data
const secretKey = 'your-encryption-key';
const sensitiveData = 'api-key-12345';
const encrypted = encrypt(sensitiveData, secretKey);
console.log('Encrypted:', encrypted);

// Decrypt when needed
const decrypted = decrypt(encrypted, secretKey);
console.log('Decrypted:', decrypted);
```

### Project Discovery and Management

```typescript
import {
  withMetaMatching,
  verifyIfMetaJsonExists,
  getFilesInDirectory,
  recursiveDirectoriesDiscovery,
} from 'jsr:@ghostmind/run';

// Find all projects of a specific type
const apiProjects = await withMetaMatching({
  type: 'app',
  tags: ['api'], // Projects tagged with 'api'
});

console.log('Found API projects:', apiProjects);

// Check if meta.json exists and load it
const metaPath = './project/meta.json';
if (await verifyIfMetaJsonExists(metaPath)) {
  const metaConfig = JSON.parse(await Deno.readTextFile(metaPath));
  console.log('Project config:', metaConfig);
}

// Get files in directory with filtering
const sourceFiles = await getFilesInDirectory('./src');
const tsFiles = sourceFiles.filter((file) => file.endsWith('.ts'));

// Discover project structure
const allDirs = await recursiveDirectoriesDiscovery('./projects');
console.log('All project directories:', allDirs);
```

### Docker Compose Integration

```typescript
import { dockerComposeBuild, dockerComposeUp } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const { has } = opts;

  // Build services if requested
  if (has('build')) {
    await dockerComposeBuild({
      services: ['api', 'ui'], // Specific services
      noCache: has('no-cache'),
    });
  }

  // Start services
  await dockerComposeUp({
    forceRecreate: has('fresh'),
    detach: !has('logs'),
    services: has('api-only') ? ['api'] : undefined,
  });
}
```

## 7. Real-World Production Examples

Based on actual implementations from the codebase, here are production-ready patterns:

### Multi-Service Deployment Pipeline

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister, terraformActivate } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const environment = args[0] || 'development';
  const { start, has, extract } = opts;

  // Multi-stage deployment with priority ordering
  await start({
    // Stage 1: Build and register containers
    register_api: {
      command: dockerRegister,
      priority: 1,
      options: { component: 'api', amd64: true, arm64: has('multiarch') },
    },
    register_ui: {
      command: dockerRegister,
      priority: 1,
      options: { component: 'ui', amd64: true },
    },

    // Stage 2: Deploy infrastructure
    activate_core: {
      command: terraformActivate,
      priority: 2,
      options: { component: 'core', arch: extract('arch') || 'amd64' },
    },

    // Stage 3: Health checks and validation
    validate_deployment: {
      command: async () => {
        console.log(`Validating ${environment} deployment...`);
        await $`curl -f ${opts.env['API_ENDPOINT']}/health`;
        console.log('Deployment validation successful');
      },
      priority: 3,
    },
  });
}
```

### Development Workflow with Tunneling

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerComposeBuild, dockerComposeUp } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const { run, has, env } = opts;

  // Conditional build step
  if (has('build')) {
    await dockerComposeBuild({});
  }

  const processes = [];

  // Setup tunnel if requested
  if (has('tunnel')) {
    const tunnelName = env['TUNNEL_NAME'];
    if (!tunnelName) {
      throw new Error(
        'TUNNEL_NAME environment variable required for tunnel mode'
      );
    }

    // Configure authentication for tunnel
    Deno.env.set('NEXTAUTH_URL', `https://${tunnelName}`);
    processes.push($`${run} tunnel run`);
  }

  // Start services
  if (has('up')) {
    processes.push(dockerComposeUp({ forceRecreate: has('fresh') }));
  }

  // Run all processes in parallel
  await Promise.all(processes);
}
```

### Machine Learning Model Deployment

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { createUUID } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const modelName = args[0] || opts.extract('model');
  const { start, env, has } = opts;

  if (!modelName) {
    throw new Error('Model name required: run custom ml-deploy <model_name>');
  }

  const deploymentId = await createUUID();
  console.log(`Starting ML deployment ${deploymentId} for model: ${modelName}`);

  await start({
    // Start model server
    serve: {
      command: async () => {
        if (has('verbose')) {
          $.verbose = true;
        }
        await $`ollama serve`;
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for startup
      },
      priority: 1,
    },

    // Pull model
    pull: {
      command: async () => {
        console.log(`Pulling model: ${modelName}`);
        await $`ollama pull ${modelName}`;
      },
      priority: 1,
    },

    // Backup to cloud storage
    backup: {
      command: async () => {
        const storageBucket = env['STORAGE_BUCKET_URL'];
        if (storageBucket) {
          console.log('Backing up models to cloud storage...');
          await $`gsutil cp -r ~/.ollama/models ${storageBucket}`;
        }
      },
      priority: 2,
    },

    // Run validation tests
    test: {
      command: async () => {
        if (has('skip-tests')) return;

        console.log('Running model validation tests...');
        const testPrompt = 'Hello, world!';
        await $`curl -X POST http://localhost:11434/api/generate \
          -H "Content-Type: application/json" \
          -d '{"model":"${modelName}","prompt":"${testPrompt}","stream":false}'`;
      },
      priority: 3,
    },
  });

  console.log(`ML deployment ${deploymentId} completed successfully`);
}
```

### Database Migration and Setup

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const command = args[0]; // 'migrate', 'seed', 'reset'
  const { start, env, has, currentPath } = opts;

  const dbUrl = env['DATABASE_URL'];
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  switch (command) {
    case 'migrate':
      await start({
        apply_migrations: {
          command: async () => {
            console.log('Applying database migrations...');
            await $`hasura migrate apply --database-name default`;
          },
          priority: 1,
        },
        apply_metadata: {
          command: async () => {
            console.log('Applying Hasura metadata...');
            await $`hasura metadata apply`;
          },
          priority: 2,
        },
      });
      break;

    case 'seed':
      if (
        has('confirm') ||
        (await confirmAction('This will modify database data'))
      ) {
        await $`hasura seeds apply --database-name default`;
      }
      break;

    case 'reset':
      if (has('force') || (await confirmAction('This will DESTROY all data'))) {
        await start({
          drop_db: {
            command: `dropdb ${extractDbName(dbUrl)}`,
            priority: 1,
          },
          create_db: {
            command: `createdb ${extractDbName(dbUrl)}`,
            priority: 2,
          },
          migrate: {
            command: async () => {
              await $`hasura migrate apply --database-name default`;
              await $`hasura metadata apply`;
            },
            priority: 3,
          },
        });
      }
      break;

    default:
      console.log(
        'Usage: run custom db-setup <migrate|seed|reset> [--force] [--confirm]'
      );
  }
}

async function confirmAction(message: string): Promise<boolean> {
  console.log(`\n⚠️  ${message}`);
  const response = prompt('Continue? (yes/no): ');
  return response?.toLowerCase() === 'yes';
}

function extractDbName(url: string): string {
  return url.split('/').pop() || 'defaultdb';
}
```

## 8. Common Patterns and Best Practices

Based on the codebase examples, here are some common patterns:

### Argument Handling with Validation

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  // Common pattern: use first argument as command
  const command = args[0];

  // Validate required arguments
  if (!command) {
    console.error('Error: Command required');
    console.log('Usage: run custom script-name <command> [options]');
    console.log('Available commands: init, deploy, test, cleanup');
    Deno.exit(1);
  }

  // Handle different commands with fallback
  switch (command) {
    case 'init':
      await initializeProject(args.slice(1), opts);
      break;
    case 'deploy':
      await deployProject(args.slice(1), opts);
      break;
    case 'test':
      await runTests(args.slice(1), opts);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      Deno.exit(1);
  }
}

async function initializeProject(args: string[], opts: CustomOptions) {
  const projectName = args[0] || opts.extract('name');
  if (!projectName) {
    throw new Error(
      'Project name required: --name=<project> or as first argument'
    );
  }
  // initialization logic
}

async function deployProject(args: string[], opts: CustomOptions) {
  const environment = args[0] || 'development';
  // deployment logic
}

async function runTests(args: string[], opts: CustomOptions) {
  const testSuite = args[0] || 'all';
  // testing logic
}
```

### Using `opts.start` for Complex Workflows

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister, terraformActivate } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  await opts.start({
    build: {
      command: dockerRegister,
      priority: 1,
      options: { component: 'api', amd64: true },
    },
    deploy: {
      command: terraformActivate,
      priority: 2,
      options: { component: 'core', arch: 'amd64' },
    },
  });
}
```

## 9. Advanced Patterns and Techniques

### Environment Variable Substitution in meta.json

The `meta.json` configuration supports dynamic variable substitution at runtime:

```json
{
  "name": "${PROJECT_NAME}",
  "type": "app",
  "docker": {
    "api": {
      "image": "${this.name}-api:${BUILD_VERSION}",
      "root": "./services/api"
    },
    "ui": {
      "image": "${this.name}-ui:latest",
      "root": "./apps/web"
    }
  },
  "tunnel": {
    "subdomain": "${TUNNEL_NAME}",
    "service": "localhost:${this.port}"
  },
  "port": 8080,
  "secrets": {
    "base": "${HOME}/.secrets/${this.name}"
  }
}
```

**Variable Types:**

- `${ENV_VAR}` - Environment variables
- `${this.property}` - Self-references to other properties in the same meta.json
- Nested references work: `${this.docker.api.image}`

### Parallel Processing Patterns

#### Using Promise.all for Concurrent Operations

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const { metaConfig, has } = opts;

  // Build multiple components in parallel
  const buildPromises = [];

  if (metaConfig.docker) {
    Object.entries(metaConfig.docker).forEach(([component, config]) => {
      buildPromises.push(
        dockerRegister({
          component,
          amd64: true,
          arm64: has('multiarch'),
          build_args: [`IMAGE_NAME=${config.image}`],
        })
      );
    });
  }

  // Execute all builds in parallel
  console.log(`Building ${buildPromises.length} components in parallel...`);
  await Promise.all(buildPromises);

  // Run validation tests in parallel
  const testPromises = [
    $`npm test --prefix ./api`,
    $`npm test --prefix ./ui`,
    $`docker run --rm ${metaConfig.docker?.api?.image} /app/healthcheck.sh`,
  ];

  const testResults = await Promise.allSettled(testPromises);

  // Check for test failures
  const failures = testResults.filter((result) => result.status === 'rejected');
  if (failures.length > 0) {
    console.error(`${failures.length} tests failed:`);
    failures.forEach((failure, index) => {
      console.error(`Test ${index + 1}:`, failure.reason);
    });
    Deno.exit(1);
  }

  console.log('All tests passed!');
}
```

#### Using opts.start with Mixed Command Types

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister, createUUID } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

async function customBuildStep(options: {
  component: string;
  version: string;
}) {
  console.log(`Custom build for ${options.component} v${options.version}`);
  // Custom build logic here
}

export default async function (args: CustomArgs, opts: CustomOptions) {
  const version = opts.extract('version') || (await createUUID(8));

  await opts.start({
    // String command - runs in shell
    prepare: {
      command: 'echo "Preparing build environment..."',
      priority: 1,
    },

    // Function command - runs TypeScript function
    custom_build: {
      command: customBuildStep,
      priority: 2,
      options: { component: 'api', version },
    },

    // Imported function command
    docker_build: {
      command: dockerRegister,
      priority: 2, // Same priority = runs in parallel with custom_build
      options: { component: 'api', amd64: true },
    },

    // Async arrow function
    finalize: {
      command: async () => {
        console.log('Finalizing deployment...');
        await $`echo "Build ${version} completed"`;
      },
      priority: 3,
    },
  });
}
```

### Dynamic Configuration Loading

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { verifyIfMetaJsonExists, withMetaMatching } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const environment = args[0] || 'development';

  // Load environment-specific configuration
  const configPath = `./config/${environment}.json`;
  let envConfig = {};

  try {
    const configText = await Deno.readTextFile(configPath);
    envConfig = JSON.parse(configText);
    console.log(`Loaded ${environment} configuration`);
  } catch {
    console.warn(`No specific config found for ${environment}, using defaults`);
  }

  // Find related projects/services
  const relatedServices = await withMetaMatching({
    type: 'app',
    tags: [opts.metaConfig.name], // Services tagged with current project name
  });

  console.log(
    `Found ${relatedServices.length} related services:`,
    relatedServices
  );

  // Process each related service
  for (const servicePath of relatedServices) {
    const serviceMetaPath = `${servicePath}/meta.json`;
    if (await verifyIfMetaJsonExists(serviceMetaPath)) {
      const serviceConfig = JSON.parse(
        await Deno.readTextFile(serviceMetaPath)
      );
      console.log(`Processing service: ${serviceConfig.name}`);

      // Perform operations on each service
      // This could be deployment, testing, configuration updates, etc.
    }
  }
}
```

### Template String Commands with opts.utils.cmd

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const { utils, metaConfig, env } = opts;
  const { cmd } = utils;

  const service = args[0];
  const region = opts.extract('region') || 'us-east-1';

  // Build complex commands with template literals
  const deployCommand = await cmd`
    gcloud run deploy ${service}
    --image gcr.io/${env['PROJECT_ID']}/${service}:latest
    --region ${region}
    --platform managed
    --allow-unauthenticated
    --port ${metaConfig.port || 8080}
    --memory 512Mi
    --cpu 1000m
  `;

  console.log('Executing deployment command:');
  console.log(deployCommand.join(' '));

  // Execute the built command
  await $`${deployCommand}`;
}
```

### Environment and Flag Handling with Validation

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

export default async function (args: CustomArgs, opts: CustomOptions) {
  // Configure verbosity early
  if (opts.has('verbose')) {
    $.verbose = true;
    console.log('Verbose mode enabled');
  }

  // Extract and validate parameters with defaults
  const environment = opts.extract('env') || 'development';
  const region = opts.extract('region') || 'us-east-1';
  const timeout = parseInt(opts.extract('timeout') || '300');

  // Validate environment variables with helpful error messages
  const requiredEnvVars = ['API_KEY', 'DATABASE_URL', 'STORAGE_BUCKET'];
  const missingVars = requiredEnvVars.filter((key) => !opts.env[key]);

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:');
    missingVars.forEach((key) => console.error(`  ${key}`));
    console.error('\nSet these in your .env file or environment');
    Deno.exit(1);
  }

  // Use environment variables safely
  const apiKey = opts.env['API_KEY']!; // Safe after validation
  const dbUrl = opts.env['DATABASE_URL']!;

  // Feature flags
  const skipTests = opts.has('skip-tests');
  const dryRun = opts.has('dry-run');
  const forceUpdate = opts.has('force');

  if (dryRun) {
    console.log('🔍 Dry run mode - no changes will be made');
  }

  console.log(`Environment: ${environment}`);
  console.log(`Region: ${region}`);
  console.log(`Timeout: ${timeout}s`);
}
```

## 10. Error Handling and Best Practices

### Comprehensive Error Handling

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

export default async function (args: CustomArgs, opts: CustomOptions) {
  try {
    // Validate prerequisites early
    await validatePrerequisites(opts);

    // Main script logic with proper error boundaries
    const result = await performOperation(args, opts);

    console.log('✅ Operation completed successfully');
    return result;
  } catch (error) {
    // Structured error handling
    if (error instanceof ValidationError) {
      console.error('❌ Validation failed:', error.message);
      console.error('💡 Suggestion:', error.suggestion);
      Deno.exit(1);
    }

    if (error instanceof CommandError) {
      console.error('❌ Command execution failed:', error.command);
      console.error('📝 Output:', error.output);

      if (opts.has('debug')) {
        console.error('🐛 Full error:', error);
      }

      Deno.exit(error.exitCode || 1);
    }

    // Unexpected errors
    console.error('💥 Unexpected error occurred:');
    console.error(error);

    if (opts.has('verbose')) {
      console.error('Stack trace:', error.stack);
    }

    Deno.exit(1);
  }
}

class ValidationError extends Error {
  constructor(message: string, public suggestion: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class CommandError extends Error {
  constructor(
    message: string,
    public command: string,
    public output: string,
    public exitCode?: number
  ) {
    super(message);
    this.name = 'CommandError';
  }
}

async function validatePrerequisites(opts: CustomOptions): Promise<void> {
  // Check required environment variables
  const requiredEnvVars = ['API_KEY', 'PROJECT_ID'];
  const missing = requiredEnvVars.filter((key) => !opts.env[key]);

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required environment variables: ${missing.join(', ')}`,
      'Create a .env file or set these variables in your environment'
    );
  }

  // Check required commands are available
  const requiredCommands = ['docker', 'gcloud'];
  for (const cmd of requiredCommands) {
    try {
      await $`which ${cmd}`;
    } catch {
      throw new ValidationError(
        `Required command '${cmd}' not found`,
        `Install ${cmd} or ensure it's in your PATH`
      );
    }
  }

  // Validate project structure
  if (!opts.metaConfig) {
    throw new ValidationError(
      'No meta.json found in current directory',
      'Run this script from a project root with meta.json'
    );
  }
}

async function performOperation(args: CustomArgs, opts: CustomOptions) {
  // Wrap shell commands with proper error handling
  try {
    const result = await $`some-command --input ${args[0]}`;
    return result.stdout.trim();
  } catch (error) {
    throw new CommandError(
      'Failed to execute operation',
      `some-command --input ${args[0]}`,
      error.stderr || error.message,
      error.exitCode
    );
  }
}
```

### Graceful Degradation and Fallbacks

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister, getProjectName } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const { has, extract, env } = opts;

  // Graceful fallbacks for optional features
  let projectName: string;
  try {
    projectName = await getProjectName();
  } catch {
    projectName = extract('name') || 'unnamed-project';
    console.warn('⚠️  Using fallback project name:', projectName);
  }

  // Optional cloud build with local fallback
  if (env['CLOUD_BUILD_ENABLED'] === 'true') {
    try {
      console.log('🌥️  Attempting cloud build...');
      await $`gcloud builds submit --tag gcr.io/${env['PROJECT_ID']}/${projectName}`;
    } catch (error) {
      console.warn('⚠️  Cloud build failed, falling back to local build');
      console.warn('Error:', error.message);

      await dockerRegister({
        component: projectName,
        amd64: true,
        cloud: false, // Force local build
      });
    }
  } else {
    console.log('🏠 Using local build');
    await dockerRegister({ component: projectName, amd64: true });
  }

  // Optional features with graceful degradation
  if (has('with-tests')) {
    try {
      await $`npm test`;
    } catch {
      console.warn('⚠️  Tests failed, continuing deployment...');
      if (!has('ignore-test-failures')) {
        console.log('💡 Use --ignore-test-failures to skip this warning');
      }
    }
  }
}
```

### Security Best Practices

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { encrypt, decrypt } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const { env, extract } = opts;

  // ✅ GOOD: Validate and sanitize inputs
  const serviceName = args[0];
  if (!serviceName || !/^[a-zA-Z0-9-]+$/.test(serviceName)) {
    throw new Error(
      'Invalid service name. Use alphanumeric characters and hyphens only.'
    );
  }

  // ✅ GOOD: Use environment variables for secrets
  const apiKey = env['API_KEY'];
  if (!apiKey) {
    throw new Error('API_KEY environment variable is required');
  }

  // ✅ GOOD: Encrypt sensitive data before logging
  const encryptionKey = env['ENCRYPTION_KEY'];
  if (encryptionKey && opts.has('verbose')) {
    const maskedKey = apiKey.slice(0, 4) + '****' + apiKey.slice(-4);
    console.log(`Using API key: ${maskedKey}`);
  }

  // ✅ GOOD: Validate file paths to prevent path traversal
  const configPath = extract('config');
  if (configPath) {
    const allowedPaths = ['./config/', './env/'];
    const isAllowed = allowedPaths.some(
      (allowed) => configPath.startsWith(allowed) && !configPath.includes('..')
    );

    if (!isAllowed) {
      throw new Error(
        'Invalid config path. Must be within allowed directories.'
      );
    }
  }

  // ✅ GOOD: Use parameterized commands to prevent injection
  const tag = extract('tag') || 'latest';
  if (!/^[a-zA-Z0-9._-]+$/.test(tag)) {
    throw new Error('Invalid tag format');
  }

  await $`docker build -t ${serviceName}:${tag} .`;

  // ❌ BAD: Never do this - direct string interpolation
  // await $`docker build -t ${args[0]}:${extract('tag')} .`;

  // ✅ GOOD: Clean up sensitive data
  if (env['TEMP_TOKEN']) {
    delete env['TEMP_TOKEN'];
  }
}
```

### Production Deployment Checklist

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (args: CustomArgs, opts: CustomOptions) {
  const environment = args[0];

  if (environment === 'production') {
    console.log('🚀 Production deployment checklist:');

    const checks = [
      {
        name: 'Environment variables',
        check: () => {
          const required = ['DATABASE_URL', 'API_KEY', 'PROJECT_ID'];
          return required.every((key) => opts.env[key]);
        },
        fix: 'Set missing environment variables',
      },
      {
        name: 'Tests passing',
        check: async () => {
          try {
            await $`npm test`;
            return true;
          } catch {
            return false;
          }
        },
        fix: 'Fix failing tests before deploying',
      },
      {
        name: 'Security scan',
        check: async () => {
          if (opts.has('skip-security')) return true;
          try {
            await $`npm audit --audit-level moderate`;
            return true;
          } catch {
            return false;
          }
        },
        fix: 'Run npm audit fix or use --skip-security',
      },
    ];

    let allPassed = true;

    for (const checkItem of checks) {
      const passed = await checkItem.check();
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${checkItem.name}`);

      if (!passed) {
        console.log(`   💡 ${checkItem.fix}`);
        allPassed = false;
      }
    }

    if (!allPassed && !opts.has('force')) {
      console.log('\n❌ Pre-deployment checks failed.');
      console.log('💡 Use --force to deploy anyway (not recommended)');
      Deno.exit(1);
    }

    if (!allPassed && opts.has('force')) {
      console.log('\n⚠️  Forcing deployment despite failed checks...');
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Give time to cancel
    }
  }

  console.log(`Deploying to ${environment}...`);
}
```

## ✅ Completion Checklist

When tasked to create a custom script, the AI must ensure:

- [ ] **DENO RUNTIME:** The script is written specifically for Deno, not Node.js.
- [ ] **DENO IMPORTS:** All imports use proper Deno syntax (`jsr:`, `npm:` prefixes, no bare imports).
- [ ] **DENO APIs:** Uses Deno's built-in APIs (`Deno.readTextFile`, `Deno.env`, etc.) instead of Node.js equivalents.
- [ ] The file is created in the correct `scripts/` directory (as defined in `meta.json`).
- [ ] The file exports a `default async function` with signature `(args: CustomArgs, opts: CustomOptions)`.
- [ ] `CustomArgs` and `CustomOptions` types are imported from `jsr:@ghostmind/run`.
- [ ] The script correctly uses `args` as an array (e.g., `args[0]` for the first argument).
- [ ] The script properly utilizes `opts` properties like `currentPath`, `has()`, `extract()`, `env`, etc.
- [ ] The script is robust and handles potential missing arguments or flags gracefully.
- [ ] The script uses `zx` (imported from `npm:zx`) for shell commands and correctly handles async operations.
- [ ] If using core utilities, they are imported from `jsr:@ghostmind/run`.
- [ ] **NO NODE.JS PATTERNS:** Avoids `require()`, `process.env`, Node.js `fs` module, etc.
- [ ] The AI returns a summary of the script created and how to run it with example command-line usage.
