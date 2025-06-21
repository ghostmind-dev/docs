# Documentation for `run custom`

## 1. Overview

The `run custom` command provides a powerful way to extend the capabilities of the `run` CLI by allowing users to define and execute custom TypeScript scripts. These scripts can automate complex workflows, integrate with various services, and manage development or operational tasks within the Ghostmind ecosystem. The core idea is to use TypeScript files that export a default asynchronous function, which then gets access to arguments and a rich set of options provided by the `run` environment.

## 2. Script File Naming and Location

Custom scripts are TypeScript files (e.g., `my_task.ts`). They are typically located in a `scripts` directory within your project, or in a path that `run` is configured to scan. When you execute `run custom <script_name_or_path>`, `run` attempts to resolve this to a `.ts` file.

For example, if you have `scripts/my_setup.ts`, you might run it as:
`run custom my_setup`
or
`run custom scripts/my_setup.ts`

The exact resolution mechanism might depend on your project's structure and `run`'s configuration.

## 3. Basic Script Structure

Every custom script must be a TypeScript module that exports a default asynchronous function. This function is the entry point for your script and receives two main parameters: `args` and `opts`.

It's crucial to import the necessary types for these parameters from `jsr:@ghostmind/run`.

```typescript
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
// Other necessary imports, e.g., for shell commands or file system access
import { $ } from 'npm:zx';
import fs from 'node:fs';

export default async function (args: CustomArgs, opts: CustomOptions) {
  // Your script logic begins here
  console.log('Custom script started!');

  // Example: Accessing an option
  const currentPath = opts.currentPath;
  console.log(`Script is running from: ${currentPath}`);

  // Example: Using an argument
  const firstInput = opts.input?.[0];
  if (firstInput) {
    console.log(`First input to script: ${firstInput}`);
  }

  // Remember to handle asynchronous operations properly
  await $`echo "Script finished."`;
}
```

## 4. Understanding `CustomArgs` (`args`)

The first parameter, `args` (often seen as `_arg` or `arg` in shorthand in the provided examples), represents arguments passed directly on the command line after the script name.

- **Type**: `CustomArgs` (typically a `string`, but can be `undefined` if no arguments are passed, or potentially an array/object depending on future `run` enhancements. The provided examples often treat it as a single primary argument or command name for the script itself).
- **Usage**: It's generally used for a primary, singular argument or when the script behaves differently based on one key input. For multiple, distinct inputs, `opts.input` is more robust.

```typescript
// Inside your script
export default async function (args: CustomArgs, opts: CustomOptions) {
  if (args === 'setup') {
    console.log('Performing setup tasks...');
  } else if (args === 'teardown') {
    console.log('Performing teardown tasks...');
  } else {
    console.log(`Received general argument: ${args}`);
  }
  // ...
}
```

To pass this `arg`: `run custom my_script setup`

## 5. Understanding `CustomOptions` (`opts`)

The second parameter, `opts`, is a crucial object provided by the `run` environment. It contains a wealth of contextual information, helper utilities, and access to core functionalities.

Here's a breakdown of its common properties as observed in the examples:

### `opts.currentPath: string`

The absolute path to the directory containing the currently executing script. Useful for resolving relative paths to other files or directories within the script's context.

```typescript
console.log(`Script location: ${opts.currentPath}`);
const configFile = `${opts.currentPath}/../config/settings.json`;
```

### `opts.input: string[]`

An array of strings representing all arguments passed to the script _after_ its name and any primary `args` value. This is the most common way to access multiple command-line inputs.

```typescript
// For: run custom my_script user:add john --role=admin
// opts.input would be: ['user:add', 'john', '--role=admin'] (actual parsing of --flags might vary)
opts.input.forEach((val, idx) => {
  console.log(`Input ${idx}: ${val}`);
});
```

### `opts.start: (tasks: Record<string, TaskDefinition>) => Promise<void>`

An asynchronous function to manage and execute a collection of named tasks. Tasks can be other functions (async or sync) or shell commands. They can also have priorities.
The `TaskDefinition` object typically has:

- `command: Function | string`: The function to call or shell command string to execute.
- `priority?: number`: Lower numbers execute earlier. Default priority is typically assigned if omitted.
- `options?: any`: An object containing options to pass to the command if it's a function.

```typescript
await opts.start({
  build_frontend: {
    command: async () => {
      await $`npm run build --prefix ./frontend`;
    },
    priority: 1,
  },
  build_backend: {
    command: 'npm run build --prefix ./backend', // Shell command string
    priority: 1,
  },
  deploy: {
    command: deployAllServices, // Assuming deployAllServices is an async function
    options: { environment: 'production' },
    priority: 2,
  },
});
```

### `opts.run: string`

A string utility (often the path to the `run` executable itself or a similar invoker) used to programmatically execute other `run` commands from within your script. It's typically used within template literals with `zx`.

```typescript
const { run } = opts;
await $`${run} terraform activate core --arch=amd64`;
await $`${run} docker register my_image --component=api`;
```

### `opts.extract: (key: string) => any`

A function to extract named arguments or options that might have been passed to the script. The exact parsing logic (e.g., `--key=value` or `--key value`) depends on the `run` environment's argument parser.

```typescript
const modelName = opts.extract('model'); // e.g., from --model=my_model
if (modelName) {
  console.log(`Using model: ${modelName}`);
}
```

### `opts.env: Record<string, string | undefined>`

An object providing access to environment variables available to the script. This is often a direct pass-through or a snapshot of `Deno.env` or `process.env`.

```typescript
const apiKey = opts.env['OPENAI_API_KEY'] || Deno.env.get('OPENAI_API_KEY');
if (!apiKey) {
  throw new Error('OPENAI_API_KEY is not set.');
}
```

### `opts.has: (key: string) => boolean`

A function to check if a specific argument, flag, or option key was passed to the script. Useful for conditional logic.

```typescript
if (opts.has('verbose')) {
  $.verbose = true;
  console.log('Verbose logging enabled.');
}
if (opts.has('local_remote')) {
  Deno.env.set('TESTING_MODE', 'local_remote');
}
```

### `opts.main: object`

An object that can provide access to core functionalities from the `jsr:@ghostmind/run` module or the `run` system itself. While many core functions like `dockerRegister` and `terraformActivate` are often imported directly from `jsr:@ghostmind/run` in the examples, `opts.main` could serve as an alternative access point or for other utilities.

```typescript
// Example: if dockerRegister was on opts.main
// (though direct import is more common in provided examples)
// if (opts.main && opts.main.dockerRegister) {
//   await opts.main.dockerRegister({ component: 'my-app', amd64: true });
// }

// Direct imports are more prevalent for these in the examples:
import { dockerRegister, terraformActivate } from 'jsr:@ghostmind/run';
// await dockerRegister(...);
// await terraformActivate(...);
```

The `opts.main` object was seen in `divers/templates/templates/pluto/scripts/init.ts` providing `dockerRegister` and `terraformActivate`.

### `opts.url: object`

An object often containing predefined URLs relevant to the script's environment or task, such as `docker` (Docker daemon/registry), `tunnel` (ngrok/cloudflare tunnel URL), `local` (localhost URL).

```typescript
const { docker, tunnel, local } = opts.url;
if (opts.has('tunnel') && tunnel) {
  console.log(`Accessing via tunnel: ${tunnel}`);
  // await fetch(tunnel);
} else if (local && opts.port) {
  console.log(`Accessing locally: ${local}:${opts.port}`);
  // await fetch(`${local}:${opts.port}`);
}
```

### `opts.port: number`

A number representing a network port, often used in conjunction with `opts.url.local` or `opts.url.docker`.

```typescript
const localEndpoint = `${opts.url.local}:${opts.port}`;
```

### `opts.test?: boolean`

A boolean flag that, if present and true, might indicate the script is running in a test mode or environment. This can be used to alter behavior, such as using mock data or different endpoints.

```typescript
if (opts.test) {
  console.log('Running in test mode.');
  // Use mock API client
}
```

### `opts.utils?: object`

An object that can contain various utility functions or objects. One observed example is `opts.utils.cmd` which appears to be a helper for constructing command arrays for `zx`.

```typescript
// From container/play/actions/gcloud/scripts/build.ts
// const { utils } = opts;
// const { cmd } = utils;
// const build = cmd`bun build ./src/main.ts --outdir ./dist --target node`;
// await $`${build}`;
```

## 6. Using External Modules and Utilities

Custom scripts can import and use a wide range of Deno and npm modules.

### Shell Commands with `zx`

`zx` is a popular library for writing shell scripts in JavaScript/TypeScript.

- **Importing**: `import { $, cd, fs, question, sleep } from 'npm:zx';`
- **Usage**:
  - Execute commands: `await $`ls -la`;`
  - Change directory: `cd('/path/to/dir');`
  - Verbose output: `$.verbose = true;`
  - File system: `await fs.readFile('file.txt', 'utf8');`
  - User input: `const name = await question('What is your name? ');`
  - Pause execution: `await sleep(1000); // 1 second`

### File System Operations

Natively, Deno provides the `Deno` global for file system operations (e.g., `Deno.readTextFile`, `Deno.writeTextFile`). Node.js compatibility allows using `node:fs`. `zx` also re-exports `fs`.

```typescript
import fs from 'node:fs'; // or import { fs } from 'npm:zx';

const content = fs.readFileSync('my_file.txt', 'utf8');
fs.writeFileSync('output.txt', 'Hello there!');
```

### Making HTTP Requests

Deno has a global `fetch` implementation. For compatibility or specific features, `npm:node-fetch` is also used in examples.

```typescript
// Using Deno's global fetch
const response = await fetch('https://api.example.com/data');
const data = await response.json();

// Or using node-fetch
import fetch from 'npm:node-fetch@4.0.0-beta.4'; // if specific version needed
// ... same usage
```

### Other Common Imports

- `OpenAI`: `import OpenAI from 'npm:openai@4.71.1';` for interacting with OpenAI APIs.
- Deno Standard Library: e.g., `import * as path from 'https://deno.land/std/path/mod.ts';` for path manipulations.
- `zod` for schema validation: `import { z } from 'npm:zod';`

## 7. Interacting with `meta.json` and Configuration Files

Custom scripts frequently need to read or modify configuration files, such as a `meta.json` specific to a component or project. This is done using standard file system operations.

```typescript
import fs from 'node:fs';
import path from 'node:path'; // For joining paths

export default async function (args: CustomArgs, opts: CustomOptions) {
  const metaPath = path.join(opts.currentPath, 'meta.json'); // Assuming meta.json is in the same dir
  try {
    const metaContent = fs.readFileSync(metaPath, 'utf8');
    const metaConfig = JSON.parse(metaContent);
    console.log(`Component Name: ${metaConfig.name}`);
    console.log(`Component Type: ${metaConfig.type}`);

    // Modify and write back (example)
    // metaConfig.version = "2.0.0";
    // fs.writeFileSync(metaPath, JSON.stringify(metaConfig, null, 2));
  } catch (error) {
    console.error(`Error reading or parsing ${metaPath}:`, error);
  }
}
```

The `meta.json` file in `ghostmind-dev/config` (content: `{"id": "AVI163jj9Ymd", "name": "config", "type": "config"}`) is a very simple example. Your scripts can interact with much more complex JSON, YAML, or other configuration file formats as needed.

## 8. Executing Custom Scripts

To run a custom script, use the `run custom` command followed by the script's name (or path) and any arguments or options it accepts.

**Format:**
`run custom <script_name_or_path> [custom_arg_for_script] [input1_for_opts.input] [input2_for_opts.input] ... [--flag_for_opts.has] [--option_for_opts.extract=value]`

**Examples:**

- `run custom init_infra`
- `run custom prepare-data --source=./data/raw`
- `run custom deploy my_service --verbose`
- `run custom labo/fine-tuning-run/meta/try-tuned "Generate a meta.json for a react component"`

The `<script_name_or_path>` is resolved by `run` to a `.ts` file (e.g., `init_infra` might become `scripts/init_infra.ts`).

## 9. Practical Examples

Here are a few examples to illustrate common patterns.

### Example 1: Simple Argument and Option Handling

This script demonstrates how to access inputs, the script's path, and check for flags.

```typescript
// scripts/docs_example_simple_args.ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

export default async function handleArgs(
  args: CustomArgs,
  opts: CustomOptions
) {
  console.log(`Script executed from: ${opts.currentPath}`);

  // Using opts.input for arguments passed after script name
  if (opts.input && opts.input.length > 0) {
    console.log('Inputs received (opts.input):');
    opts.input.forEach((input, index) => {
      console.log(`  Input ${index + 1}: ${input}`);
    });
  } else {
    console.log('No direct inputs provided via opts.input.');
  }

  // 'args' parameter often holds the first argument or a command-like string
  if (args) {
    console.log(`Value of 'args' parameter: ${args}`);
  } else {
    console.log("'args' parameter is not set.");
  }

  if (opts.has('verbose')) {
    console.log('Verbose mode enabled.');
    $.verbose = true;
  } else {
    console.log('Verbose mode not enabled.');
    $.verbose = false;
  }

  await $`echo "Simple example finished."`;
}
```

**To run:** `run custom docs_example_simple_args main_arg input1 input2 --verbose`

### Example 2: Running Shell Commands with `zx`

This script shows basic file and directory manipulation using `zx`.

```typescript
// scripts/docs_example_shell_commands.ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx';

export default async function manageFiles(
  args: CustomArgs,
  opts: CustomOptions
) {
  $.verbose = opts.has('verbose');

  try {
    const initialDir = (await $`pwd`).stdout.trim();
    console.log(`Initial directory: ${initialDir}`);

    const dirName = 'temp_example_dir';
    await $`mkdir -p ${dirName}`;
    console.log(`Created directory: ${dirName}`);

    cd(dirName);
    console.log(`Changed to directory: ${(await $`pwd`).stdout.trim()}`);

    await $`echo "Hello from inside!" > greeting.txt`;
    console.log('Created greeting.txt. Contents:');
    await $`cat greeting.txt`;

    cd('..'); // Go back to the initial directory
    await $`rm -rf ${dirName}`;
    console.log(`Cleaned up directory: ${dirName}`);
  } catch (error) {
    console.error(`Shell command failed: ${error.message || error}`);
  }
}
```

**To run:** `run custom docs_example_shell_commands --verbose`

### Example 3: Using `opts.start` for Multiple Tasks

Demonstrates orchestrating multiple functions or commands with priorities.

```typescript
// scripts/docs_example_multi_task.ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';

async function buildComponent(options: { componentName: string }) {
  console.log(`Building ${options.componentName}...`);
  await $`sleep 1 && echo "${options.componentName} built successfully."`;
}

async function deployService(options: {
  serviceName: string;
  version: string;
}) {
  console.log(`Deploying ${options.serviceName} version ${options.version}...`);
  await $`sleep 1 && echo "${options.serviceName} deployed successfully."`;
}

export default async function orchestrate(
  args: CustomArgs,
  opts: CustomOptions
) {
  console.log('Starting multi-task orchestration...');

  await opts.start({
    simple_echo: {
      command: 'echo "This is a simple shell command task run via start"',
      priority: 0, // Runs earliest
    },
    build_api: {
      command: () => buildComponent({ componentName: 'api-service' }),
      priority: 1,
    },
    build_worker: {
      command: buildComponent,
      options: { componentName: 'worker-service' },
      priority: 2,
    },
    deploy_all: {
      command: async () => {
        await deployService({
          serviceName: 'api-and-worker',
          version: '1.0.0',
        });
        console.log('All services deployed through combined task.');
      },
      priority: 3,
    },
  });

  console.log('All tasks in opts.start have been processed.');
}
```

**To run:** `run custom docs_example_multi_task`

### Example 4: Using Core Functions (Direct Import)

Illustrates using functions provided by `jsr:@ghostmind/run`.

```typescript
// scripts/docs_example_core_functions.ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
// Core functions are typically imported directly
import {
  dockerRegister,
  terraformActivate,
  createUUID,
} from 'jsr:@ghostmind/run';

export default async function coreOperations(
  args: CustomArgs,
  opts: CustomOptions
) {
  const newId = await createUUID();
  console.log(`Generated new UUID: ${newId}`);

  console.log('Starting core operations...');

  await dockerRegister({
    component: 'my-app-component',
    amd64: true,
    cloud: opts.has('cloud'), // Example: use a flag to determine options
    build_args: opts.has('prod') ? ['VERSION=1.0.0'] : ['VERSION=dev'],
  });
  console.log('Docker registration task submitted.');

  await terraformActivate({
    component: 'my-infra-core',
    arch: 'amd64',
  });
  console.log('Terraform activation task submitted.');

  console.log('Core operations finished.');
}
```

**To run:** `run custom docs_example_core_functions --cloud --prod`

## 10. Available Functions & Types from `jsr:@ghostmind/run`

The `jsr:@ghostmind/run` module is the primary source for types and core utilities used in custom scripts. Key imports observed include:

- **Types**:
  - `CustomArgs`: Type for the first argument to the script function.
  - `CustomOptions`: Type for the second (options) argument.
- **Core Utilities** (typically imported directly):
  - `createUUID(): Promise<string>`: Generates a unique identifier.
  - `dockerRegister(options: DockerRegisterOptions): Promise<void>`: Manages Docker image registration. ( `DockerRegisterOptions` would include `component`, `cloud`, `amd64`, `arm64`, `build_args`, etc.)
  - `terraformActivate(options: TerraformActivateOptions): Promise<void>`: Handles Terraform activation steps. ( `TerraformActivateOptions` would include `component`, `arch`, etc.)
  - `has(key: string): boolean`: (While often on `opts.has`, some examples like `labo/open-webui-ollama/scripts/upload.ts` import `has` directly. Clarify if this is a standalone utility or always part of `opts`). _Correction from examples: `has` seems to be primarily on `opts` or destructured from `opts`._

Always refer to the specific version of `jsr:@ghostmind/run` for the most up-to-date list of exports and their signatures.
