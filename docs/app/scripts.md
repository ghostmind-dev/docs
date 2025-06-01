## Automation Scripts Guide - Scripts Pattern

This guide tells an AI **exactly** what to do when implementing the **Scripts Pattern** - creating automation scripts within the standardized directory structure. This is one of the five core patterns (app, docker, infra, local, scripts) defined in our system.

**📄 Base Reference:** [base.md](https://github.com/ghostmind-dev/docs/blob/main/docs/app/base.md)

> 🧠 **IMPORTANT:** The AI must read and understand `base.md` first to learn about all five directory patterns, then return here for specific Scripts Pattern implementation details.

**📍 Pattern Focus:** This document covers the `scripts/` directory pattern only. For other patterns, refer to their respective documentation.

---

# Ghostmind Run Custom Script Command (`run script`)

## Overview

The **`run script`** command (formerly called `run custom`) allows you to execute custom TypeScript scripts in a Ghostmind project using Deno. This mechanism lets you write project-specific automation and tasks as TypeScript files, and run them via the `run` CLI. Each script file must export a **default function** which will be invoked by the `run script` command. The script runs within the context of your project directory and is provided with a rich set of **injected utilities** and environment information at runtime.

In essence, calling `run script <scriptName> [args...]` will:

1. Locate the `<scriptName>.ts` file in the project (by default under a `scripts/` directory, configurable via project meta settings or CLI options).
2. Dynamically import that TypeScript module into Deno.
3. Find the module’s default export (a function), and **call it** with two arguments:

   - An array of command-line arguments passed to the script (if any).
   - An object of **runtime utilities** (helper functions, environment, config, etc.) injected by the runner.

4. Wait for the script’s default function to complete (it can be `async`), then exit. If the script throws an error or returns a rejected promise, the runner will catch it and log the error.

This provides a flexible way to script custom operations (build steps, dev setup, data migration, etc.) while leveraging the Ghostmind-run API and shell commands seamlessly.

**Note:** The `run custom` command is deprecated in favor of `run script`. They function identically, but you should use `run script` going forward for clarity.

## Script File Setup and Requirements

To create a custom script, add a TypeScript file (e.g. `myTask.ts`) in your scripts directory (by default, `<projectRoot>/scripts/`). If your project’s `meta.json` defines a custom scripts root, place the file accordingly. You can also specify a custom path at runtime with `--root <dir>` when running the command.

**File naming:** The script name (without extension) is used to invoke it. For example, `scripts/dev.ts` is run with `run script dev`. The runner will automatically append `.ts` and look under the configured scripts folder (and, if `--root` is provided, under that path as well).

**Default export function:** Each script **must export a default function**. The runner will call this function with the signature:

```ts
export default async function main(args: string[], opts: CustomOptions) {
  // ...
}
```

- **`args`** – An array of string arguments provided after the script name in the CLI (empty array if none).
- **`opts`** – A `CustomOptions` object containing injected utilities and context (detailed in the next section).

Mark the function `async` if you perform asynchronous operations. Return values are ignored by the runner; simply resolving is enough.

**Imports and types:**

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerComposeBuild, dockerComposeUp } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx';
```

## Runtime Utilities (`CustomOptions`)

| Property      | Type                                   | Description                                        |
| ------------- | -------------------------------------- | -------------------------------------------------- |
| `env`         | `Record<string,string>`                | Snapshot of environment variables.                 |
| `currentPath` | `string`                               | Working directory path when script starts.         |
| `metaConfig`  | `any`                                  | Parsed `meta.json` with env placeholders expanded. |
| `run`         | `string`                               | Path to the Ghostmind‑run CLI entry point.         |
| `main`        | `typeof import('…/main.ts')`           | Programmatic access to all Run commands.           |
| `cmd`         | `(...): string[]`                      | Helper to build safe command argument arrays.      |
| `extract`     | `(name:string)=>string?`               | Get `name=value` argument’s value.                 |
| `has`         | `(flag:string)=>boolean`               | Check presence of standalone flag.                 |
| `start`       | `(config: StartConfig)=>Promise<void>` | Orchestrate multiple tasks.                        |

### Quick Reference Examples

```ts
// Access env var
const apiKey = opts.env['API_KEY'];

// Extract named param
const env = opts.extract('env') ?? 'dev';

// Check flag
if (opts.has('dry-run')) console.log('Dry run mode');

// Run another Run CLI command
await $`${opts.run} tunnel run`;

// Call internal helper
await opts.main.dockerRegister({ amd64: true });
```

## Handling Arguments

- **Positional**: `const [src, dest] = args;`
- **Named**: `opts.extract('env') // => "prod"`
- **Flags**: `opts.has('force') // => true`

## Orchestrating Tasks with `start`

```ts
await opts.start({
  build: { command: dockerComposeBuild, priority: 998 },
  tunnel: `${opts.run} tunnel run`,
  up: {
    command: dockerComposeUp,
    options: { forceRecreate: true },
  },
});
```

- Tasks with lower `priority` run first.
- Same‑priority tasks run **concurrently**.
- Provide `--all` when invoking the script to run every task; otherwise only tasks matching CLI args execute.

### Task Definition Forms

1. **String** – shell command.
2. **Function** – async function.
3. **Object** – `{ command, priority?, options? | variables? }`.

## Best Practices

1. **Keep `meta.json` authoritative** – reference `opts.metaConfig` instead of hard‑coding.
2. **Use `zx` for shell** – remember to `import { $ } from 'npm:zx';`.
3. **Prefer `opts.main`** over subprocess when possible.
4. **Validate required args** early and throw friendly errors.
5. **No `Deno.exit()`** – just let your function resolve.
6. **Mind concurrency** – avoid conflicting parallel tasks.

## Example Scripts

# Examples

Found 95 TypeScript file(s) containing "CustomArgs":

## 1. labo/fine-tuning-run/meta/try-tuned.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { createUUID } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';
import fs from 'node:fs';
import fetch from 'npm:node-fetch@4.0.0-beta.4';
import OpenAI from 'npm:openai@4.71.0';
import { zodResponseFormat } from 'npm:openai/helpers/zod';
import { z } from 'npm:zod';
import { mata_schema } from './zod-schema.ts';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { currentPath, input } = opts;

  const openai = new OpenAI();

  const META_FINE_TUNED_MODEL_ID = Deno.env.get('META_FINE_TUNED_MODEL_ID')!;

  // read the schema.json file
  const schema = JSON.parse(
    fs.readFileSync(`${currentPath}/meta/schema.json`, 'utf8')
  );

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful assistant.You need to generate a meta.json file for the given input.',
      },
      {
        role: 'system',
        content: `Here is the schema: ${JSON.stringify(
          schema
        )} for the meta.json`,
      },
      {
        role: 'user',
        content: input?.[0] ?? 'Generate a meta.json file for next.js file',
      },
    ],
    model: META_FINE_TUNED_MODEL_ID,
    response_format: zodResponseFormat(mata_schema, 'properties'),
  });
  console.log(completion.choices[0]);

  let fileName = await createUUID();

  // Correctly parse the message content if it's a string
  const messageContent = completion.choices[0].message.content;
  if (messageContent !== null) {
    const content = JSON.parse(messageContent);

    // write the output to a file
    fs.writeFileSync(
      `${currentPath}/meta/generated/${fileName}.json`,
      JSON.stringify(content, null, 2) // Ensure proper formatting
    );
  } else {
    console.error('Message content is null');
  }
}
```

## 2. labo/fine-tuning-run/meta/upload-file.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';
import fs from 'node:fs';
import fetch from 'npm:node-fetch@4.0.0-beta.4';
import OpenAI from 'npm:openai@4.71.1';
import { Blob, Buffer } from 'node:buffer';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { currentPath } = opts;

  const openai = new OpenAI();

  const formData = new FormData();
  formData.append('purpose', 'fine-tune');

  const fileStream = fs.createReadStream(
    `${currentPath}/meta/training_data.jsonl`
  );
  const chunks: Buffer[] = [];
  fileStream.on('data', (chunk: Buffer) => chunks.push(chunk));
  fileStream.on('end', async () => {
    const fileBuffer = Buffer.concat(chunks);
    const fileBlob = new Blob([fileBuffer]);
    formData.append('file', fileBlob, 'machine-meta-training');

    const response = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    const result = await response.json();
    console.log(result);
  });
  fileStream.on('error', (err) => {
    console.error('Error reading file:', err);
  });
}
```

## 3. labo/fine-tuning-run/meta/fine-tune.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';
import fs from 'node:fs';
import fetch from 'npm:node-fetch@4.0.0-beta.4';
import OpenAI from 'npm:openai@4.71.1';
import { Blob, Buffer } from 'node:buffer';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { currentPath } = opts;

  const openai = new OpenAI();

  const TRAINING_DATA_ID = Deno.env.get('META_TRAINING_FILE_ID')!;
  const MODEL_NAME = 'gpt-4o-2024-08-06';

  const fineTune = await openai.fineTuning.jobs.create({
    training_file: TRAINING_DATA_ID,
    model: MODEL_NAME,
  });

  console.log(fineTune);
}
```

## 4. labo/fine-tuning-run/meta/prepare-data.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, fs } from 'npm:zx@8.1.3';

////////////////////////////////////////////////////////////
// TYPES
////////////////////////////////////////////////////////////

interface Example {
  id: string;
  name: string;
  description: string;
  type: string;
  [key: string]: any;
}

interface Message {
  role: string;
  content: string;
}

interface TrainingData {
  messages: Message[];
}

////////////////////////////////////////////////////////////
// MAIN
////////////////////////////////////////////////////////////

async function convertExampleToTrainingData(
  example: Example
): Promise<TrainingData> {
  const systemMessage: Message = {
    role: 'system',
    content: 'Convert the following example to a structured format.',
  };

  const userMessage: Message = {
    role: 'user',
    content: example.description,
  };

  const assistantMessage: Message = {
    role: 'assistant',
    content: JSON.stringify(example),
  };

  return {
    messages: [systemMessage, userMessage, assistantMessage],
  };
}

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { currentPath } = opts;

  const dir = await fs.opendir(`${currentPath}/meta/examples`);
  const fileStream = await fs.createWriteStream('meta/training_data.jsonl', {
    flags: 'w',
  });

  for await (const file of dir) {
    const filePath = `${currentPath}/meta/examples/${file.name}`;
    const example: Example = await fs
      .readFile(filePath, 'utf-8')
      .then(JSON.parse);
    const data = await convertExampleToTrainingData(example);

    // Write each TrainingData object as a separate line
    fileStream.write(JSON.stringify(data) + '\n');
  }

  fileStream.end();
}

////////////////////////////////////////////////////////////
// ENTRYPOINT
////////////////////////////////////////////////////////////
```

## 5. labo/fine-tuning-run/meta/generate-zod.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';
import fs from 'node:fs';
import fetch from 'npm:node-fetch@4.0.0-beta.4';
import OpenAI from 'npm:openai@4.71.1';

import { jsonSchemaToZod } from 'npm:json-schema-to-zod';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { currentPath } = opts;

  const openai = new OpenAI();

  const META_FINE_TUNED_MODEL_ID = Deno.env.get('META_FINE_TUNED_MODEL_ID')!;

  // read the schema.json file
  const schemaJson = JSON.parse(
    fs.readFileSync(`${currentPath}/meta/schema.json`, 'utf8')
  );

  const module = jsonSchemaToZod(schemaJson, {
    module: 'esm',
    name: 'mata_schema',
  });

  fs.writeFileSync(`${currentPath}/meta/zod-schema.ts`, module.toString());

  // need to manually replace 'zod' with 'npm:zod' in the zod-schema.ts file
  // need to manually remove all regex from the zod-schema.ts file
  // need to manually remove all superRefine from the zod-schema.ts file
}
```

## 6. labo/ollama-llm-inference/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { terraformActivate, dockerRegister } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { start } = opts;

  await start({
    build_llm: {
      command: dockerRegister,
      priority: 998,
      options: {
        component: 'tokenizer',
        cloud: true,
        amd64: true,
        build_args: ['MODEL=llama3.2:3b'],
      },
    },
    build_server: {
      command: dockerRegister,
      priority: 998,
      options: {
        amd64: true,
        component: 'server',
      },
    },
    activate: {
      command: terraformActivate,
      options: {
        component: 'core',
        arch: 'amd64',
      },
    },
  });
}
```

## 7. labo/ollama-llm-inference/scripts/call.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, _opts: CustomOptions) {
  const { input } = _opts;

  const question = input[0] as string;

  const response = await fetch(`${Deno.env.get('API_ENDPOINT_URL')}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('API_ENDPOINT_SECRET')}`,
    },
    body: JSON.stringify({
      prompt: question,
    }),
  });

  const data = await response.json();
  console.log(data);
}
```

## 8. labo/open-webui-ollama/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { terraformActivate, dockerRegister } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { start } = opts;

  await start({
    build_webui: {
      command: dockerRegister,
      options: {
        component: 'webui',
        amd64: true,
      },
    },
    build_ollama: {
      command: dockerRegister,
      options: {
        amd64: true,
        cloud: false,
        component: 'ollama',
      },
    },
    activate: {
      command: terraformActivate,
      priority: 1001,
      options: {
        component: 'run',
        arch: 'amd64',
      },
    },
  });
}
```

## 9. labo/open-webui-ollama/scripts/upload.ts

```ts
import { has, type CustomArgs, type CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd, sleep } from 'npm:zx@8.1.3';

export default async function (arg: CustomArgs, _opts: CustomOptions) {
  const { start, run, extract, env, has } = _opts;

  const model_name = extract('model');
  const STORAGE_BUCKET_URL = env['STORAGE_BUCKET_URL'];

  const HOME = env['HOME'];

  await start({
    serve: {
      command: async () => {
        await $`${run} misc stop 11434`;
        $`ollama serve`;
        await sleep(2000);
      },
      priority: 1,
    },
    pull: {
      command: async () => {
        await sleep(5000);

        $.verbose = true;
        await $`${run} misc wait http://host.docker.internal:11434 --mode fetch`;
        await $`ollama pull ${model_name}`;
      },
      priority: 1,
    },
    copy: {
      command: async () => {
        await sleep(3000);
        await $`gsutil cp -r ${HOME}/.ollama/models ${STORAGE_BUCKET_URL}`;
      },
      priority: 2,
    },
    clean: {
      command: async () => {
        await sleep(3000);
        await $`ollama rm ${model_name}`;
      },
    },
  });

  Deno.exit(0);
}
```

## 10. divers/hide-unhide/scripts/publish.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

// need to login first with vsce login publisher_id

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { currentPath, env } = opts;

  $.verbose = true;

  const PUBLISHER_ID = env['PUBLISHER_ID'];

  cd(`${currentPath}/app`);

  await $`npm run package`;

  await $`vsce publish`;
}
```

## 11. divers/inference-gpu/agents/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister } from 'jsr:@ghostmind/run';

import { terraformActivate } from '../../../dev/run/main.ts';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { start } = opts;

  await start({
    register: {
      command: dockerRegister,
      priority: 998,
      options: {
        amd64: true,
      },
    },
    activate: {
      command: terraformActivate,
      options: {
        component: 'core',
        arch: 'amd64',
      },
    },
  });
}
```

## 12. divers/inference-gpu/agents/scripts/call.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { fetch } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const url = 'https://agents.ghostmind.app';
  // const url = 'http://host.docker.internal:8080';
  const data = {
    key1: 'value1',
    key2: 'value2',
  };
  try {
    // Perform the POST request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('API_ENDPOINT_SECRET')}`, // Use an authorization token if required
      },
      body: JSON.stringify(data), // Send the payload
    });
    // Parse and log the response
    const result = await response.json();
    console.log('Response:', result);
  } catch (error) {
    console.error('Error during fetch:', error);
  }
}
```

## 13. divers/templates/templates/magnetic/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister } from 'jsr:@ghostmind/run';

import { terraformActivate } from '../../../dev/run/main.ts';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { start } = opts;

  await start({
    register: {
      command: dockerRegister,
      priority: 998,
      options: {
        amd64: true,
      },
    },
    activate: {
      command: terraformActivate,
      options: {
        component: 'core',
        arch: 'amd64',
      },
    },
  });
}
```

## 14. divers/templates/templates/magnetic/scripts/call.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { fetch } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  // Define the API endpoint and payload for the POST request

  if (_arg == 'local_docker') {
    const url = 'http://localhost:8080'; // Replace with your actual URL
    const data = {
      key1: 'value1',
      key2: 'value2',
    };
    try {
      // Perform the POST request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('API_ENDPOINT_SECRET')}`, // Use an authorization token if required
        },
        body: JSON.stringify(data), // Send the payload
      });
      // Parse and log the response
      const result = await response.json();
      console.log('Response:', result);
    } catch (error) {
      console.error('Error during fetch:', error);
    }
  }
}
```

## 15. divers/templates/templates/causality/scripts/activate.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { run, currentPath } = opts;

  cd(`${currentPath}`);

  $.verbose = true;

  await $`kubectl apply -f kube/main.yaml`;
}
```

## 16. divers/templates/templates/causality/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { run } = opts;

  $.verbose = true;

  await $`${run} terraform activate core`;
}
```

## 17. divers/templates/templates/causality/scripts/login.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const GCP_CLUSTER_ZONE = Deno.env.get('GCP_CLUSTER_ZONE');
  const PROJECT = Deno.env.get('PROJECT');
  const APP = Deno.env.get('APP');
  const ENV = Deno.env.get('ENV');
  const CLUSTER_NAME = `${PROJECT}-${ENV}-${APP}`;

  await $`gcloud container clusters get-credentials ${CLUSTER_NAME} --region=${GCP_CLUSTER_ZONE}`;
}
```

## 18. divers/templates/templates/causality/scripts/secrets.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, _opts: CustomOptions) {
  const NGC_TOKEN = Deno.env.get('NGC_TOKEN');
  const NGC_EMAIL = Deno.env.get('NGC_EMAIL');

  $.verbose = true;

  try {
    await $`kubectl delete secret regcred -n default`;
  } catch {
    // ignore
  }

  await $`kubectl create secret docker-registry regcred --docker-server=nvcr.io/nvaie --docker-username=\\$oauthtoken --docker-password=${NGC_TOKEN} --docker-email=${NGC_EMAIL} -n default`;

  try {
    await $`kubectl delete secret ngc-key  -n default`;
  } catch {
    // ignore
  }

  await $`kubectl create secret generic ngc-key --from-literal=NGC_API_KEY=${Deno.env.get(
    'NGC_TOKEN'
  )}`;
}
```

## 19. divers/templates/templates/causality/scripts/question.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import OpenAI from 'npm:openai';
import { $ } from 'npm:zx@8.1.0/core';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { url } = opts;

  const { docker } = url;

  $.verbose = false;

  // create a simple fecth to docker url
  const openai = new OpenAI({
    apiKey: Deno.env.get('NGC_TOKEN'),
    baseURL: `${docker}:8000/v1`,
  });

  const completion = await openai.chat.completions.create({
    model: 'meta/llama3-8b-instruct',
    messages: [{ role: 'user', content: 'When it is time to go, it is time' }],
    temperature: 0.7,
    top_p: 1,
    max_tokens: 1024,
    stream: true,
  });

  let finalAnswer = '';
  for await (const token of completion) {
    finalAnswer += token.choices[0].delta?.content || '';
  }

  console.log(finalAnswer);
}
```

## 20. divers/templates/templates/causality/scripts/clean.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { run, currentPath } = opts;

  cd(`${currentPath}/infra/core`);

  await $`terraform state rm module.nvidia-gke.kubernetes_namespace_v1.gpu-operator`;

  cd(`${currentPath}`);

  await $`${run} terraform destroy core`;
}
```

## 21. divers/templates/templates/scorpion/scripts/init.ts

```ts
import { $ } from 'npm:zx';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister } from 'jsr:@ghostmind/run';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  await dockerRegister({
    amd64: true,
    arm64: true,
  });
}
```

## 22. divers/templates/templates/pluto/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  const { main } = opts;

  const { dockerRegister, terraformActivate } = main;

  await dockerRegister({
    amd64: true,
  });

  await terraformActivate({
    component: 'core',
    arch: 'amd64',
    docker: 'default',
  });
}
```

## 23. divers/templates/templates/pluto/scripts/test.ts

```ts
import { fetch } from 'npm:zx';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  const { env, url, port } = opts;

  ///////////////////////////////////////////////////////////////////////////////
  // LOCAL AND REMOTE URL
  ///////////////////////////////////////////////////////////////////////////////

  const { docker, tunnel, local } = url;

  ///////////////////////////////////////////////////////////////////////////////
  // CONVERT POST
  ///////////////////////////////////////////////////////////////////////////////

  if (arg === 'local_convert') {
    const convert = await fetch(`${local}:${port}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: env.API_KEY,
      },
      body: JSON.stringify({
        from: 'USD',
        to: 'EUR',
        amount: 100,
      }),
    });

    const resultConvert = await convert.json();

    console.log(resultConvert);
  }

  ///////////////////////////////////////////////////////////////////////////////
  // GET HOME LOCALLY
  ///////////////////////////////////////////////////////////////////////////////

  if (arg === 'local_home') {
    const home = await fetch(`${docker}:${port}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const resultHome = await home.json();
  }

  ///////////////////////////////////////////////////////////////////////////////
  // GET HOME LOCALLY
  ///////////////////////////////////////////////////////////////////////////////

  if (arg === 'remote_home') {
    // get to the home page

    const home = await fetch(`${tunnel}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const resultHome = await home.json();
  }

  ///////////////////////////////////////////////////////////////////////////////
  // THE END
  ///////////////////////////////////////////////////////////////////////////////
}
```

## 24. divers/templates/templates/axiom/scripts/activate.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { run, currentPath } = opts;

  cd(`${currentPath}`);

  $.verbose = true;

  await $`kubectl apply -f kube/main.yaml`;
}
```

## 25. divers/templates/templates/axiom/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { run } = opts;

  $.verbose = true;

  await $`${run} terraform activate core`;
}
```

## 26. divers/templates/templates/axiom/scripts/login.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const GCP_CLUSTER_ZONE = Deno.env.get('GCP_CLUSTER_ZONE');
  const PROJECT = Deno.env.get('PROJECT');
  const APP = Deno.env.get('APP');
  const ENV = Deno.env.get('ENV');
  const CLUSTER_NAME = `${PROJECT}-${ENV}-${APP}`;

  await $`gcloud container clusters get-credentials ${CLUSTER_NAME} --region=${GCP_CLUSTER_ZONE}`;
}
```

## 27. divers/templates/templates/axiom/scripts/secrets.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, _opts: CustomOptions) {
  const NGC_TOKEN = Deno.env.get('NGC_TOKEN');
  const NGC_EMAIL = Deno.env.get('NGC_EMAIL');

  try {
    await $`kubectl delete secret regcred -n default`;
  } catch {
    // ignore
  }
  $.verbose = true;

  await $`kubectl create secret docker-registry regcred --docker-server=nvcr.io/nvaie --docker-username=\\$oauthtoken --docker-password=${NGC_TOKEN} --docker-email=${NGC_EMAIL} -n default`;
}
```

## 28. divers/templates/templates/axiom/scripts/clean.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { run, currentPath } = opts;

  cd(`${currentPath}/infra/core`);

  await $`terraform state rm module.nvidia-gke.kubernetes_namespace_v1.gpu-operator`;

  cd(`${currentPath}`);

  await $`${run} terraform destroy core`;
}
```

## 29. divers/templates/templates/butane/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister, terraformActivate } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { start } = opts;

  await start({
    register: {
      command: dockerRegister,
      priority: 998,
      options: {
        amd64: true,
      },
    },
    activate: {
      command: terraformActivate,
      options: {
        component: 'core',
        arch: 'amd64',
      },
    },
  });
}
```

## 30. divers/templates/templates/butane/scripts/test.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { fetch } from 'npm:zx@8.1.2';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { url, port, has } = opts;
  const { tunnel, local } = url;

  if (has('tunnel')) {
    try {
      await fetch(tunnel);
      console.log('Tunnel is up and running');
    } catch (error) {
      console.error('Tunnel is down');
    }
  }

  if (has('local')) {
    try {
      await fetch(`${local}:${port}`);
      console.log('Local server is up and running');
    } catch (error) {
      console.error('Local server is down');
    }
  }
}
```

## 31. divers/gym/labo/langgraph-py/scripts/install.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { currentPath } = opts;

  $.verbose = true;

  cd(`${currentPath}/app`);

  await $`poetry install`;

  await $`.venv/bin/python -m ipykernel install --user --name=labo_wave --display-name "Labo Wave"`;
}
```

## 32. archives/numpad/scripts/install.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  $.verbose = true;

  const { currentPath } = opts;

  cd(`${currentPath}/numpad`);

  await $`python3 -m pip install -r requirements.txt`;
}
```

## 33. archives/numpad/scripts/play.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { spawn } from 'node:child_process';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { currentPath } = opts;

  $.verbose = true;

  spawn('nodemon', ['--exec', 'python3', 'numpad/src/main.py'], {
    stdio: 'inherit',
    cwd: currentPath,
  });
}
```

## 34. archives/puppeteer-tor/surf/capture.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, question } from 'npm:zx@8.1.3';
import puppeteer from 'npm:puppeteer@21.1.1';
import fs from 'node:fs';
import path from 'node:path';
import Table from 'npm:cli-table3';
import WebTorrent from 'npm:webtorrent';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  const browser = await puppeteer.launch({
    args: ['--proxy-server=socks5://127.0.0.1:9050'],
    headless: true,
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  const searchQuery = arg;
  const searchQueryQualified = encodeURIComponent(searchQuery);

  const targetUrl = Deno.env.get('TARGET_URL') + searchQueryQualified;

  const page = await browser.newPage();
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  // print the page content

  const entriesArray = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('li.list-entry.alt#st')).map(
      (li) => {
        const titleText = li.querySelector('.item-title a').textContent;
        const truncatedTitle = titleText.split(' ').slice(0, 5).join(' ');
        const title =
          titleText.split(' ').length > 5
            ? `${truncatedTitle}...`
            : truncatedTitle;

        const dateText = li
          .querySelector('.item-uploaded label')
          .getAttribute('title');
        const uploadDate = li.querySelector('.item-uploaded label').textContent;

        return {
          fullTitle: titleText,
          title,
          seed: parseInt(li.querySelector('.item-seed').textContent, 10),
          leech: parseInt(li.querySelector('.item-leech').textContent, 10),
          size: li.querySelector('.item-size').textContent,
          date: uploadDate,
          magnet_link: li
            .querySelector('.item-icons a')
            .href.replace('&amp;', '&'),
        };
      }
    );
  });

  // Create a table using cli-table3 with row height set to 3
  const table = new Table({
    head: ['ID', 'Full Title', 'Seed', 'Leech', 'Size', 'Date'],
    colWidths: [5, 50, 10, 10, 15, 12],
    rowHeights: [1, 3],
    style: { 'padding-left': 1, 'padding-right': 1, head: ['cyan'] },
    wordWrap: true,
  });

  // Add rows to the table with word wrapping in reverse order
  [...entriesArray]
    .reverse()
    .forEach(({ fullTitle, seed, leech, size, date }, index) => {
      const wrappedTitle =
        fullTitle.match(new RegExp(`.{1,${45}}`, 'g'))?.join('\n') || fullTitle;
      table.push([
        entriesArray.length - index,
        wrappedTitle,
        seed,
        leech,
        size,
        date,
      ]);
    });

  await browser.close();

  // Print the table
  console.log(table.toString());

  // Ask the user which item should be activated
  const itemId = await question('Enter the ID of the item to activate: ');

  // Find the selected item
  const selectedItem = entriesArray[parseInt(itemId, 10) - 1];

  if (selectedItem) {
    console.log(`Activating item: ${selectedItem.fullTitle}`);

    const downloadPath = '/Volumes/STORAGE/plex/';

    try {
      $.verbose = true;
      // Use zx to run webtorrent CLI
      await $`echo ${selectedItem.magnet_link} | pbcopy`;
      Deno.exit(0);
    } catch (error) {
      console.error('Download failed:', error);
    }
  } else {
    console.log('Invalid ID entered.');
  }
}
```

## 35. archives/inference-wihtout-gpu/agents/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister } from 'jsr:@ghostmind/run';

import { terraformActivate } from '../../../dev/run/main.ts';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { start } = opts;

  await start({
    register: {
      command: dockerRegister,
      priority: 998,
      options: {
        amd64: true,
      },
    },
    activate: {
      command: terraformActivate,
      options: {
        component: 'core',
        arch: 'amd64',
      },
    },
  });
}
```

## 36. archives/inference-wihtout-gpu/agents/scripts/call.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { fetch } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const url = 'https://agents.ghostmind.app';
  // const url = 'http://host.docker.internal:8080';
  const data = {
    key1: 'value1',
    key2: 'value2',
  };
  try {
    // Perform the POST request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('API_ENDPOINT_SECRET')}`, // Use an authorization token if required
      },
      body: JSON.stringify(data), // Send the payload
    });
    // Parse and log the response
    const result = await response.json();
    console.log('Response:', result);
  } catch (error) {
    console.error('Error during fetch:', error);
  }
}
```

## 37. prototype/gemma/scripts/app.ts

```ts
// To run this code in Deno

import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';

// Mock function to simulate getting weather data
function getWeather(location: string): string {
  // This is just a mock - in a real app, you would call a weather API
  const mockWeatherData = {
    Paris: { temp: 22, condition: 'Sunny' },
    London: { temp: 18, condition: 'Cloudy' },
    'New York': { temp: 25, condition: 'Partly Cloudy' },
    Tokyo: { temp: 28, condition: 'Clear' },
  };

  const cityData = mockWeatherData[location as keyof typeof mockWeatherData];
  if (cityData) {
    return `The weather in ${location} is ${cityData.condition} with a temperature of ${cityData.temp}°C.`;
  } else {
    return `Weather data for ${location} is not available.`;
  }
}

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  $.verbose = true;

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('Please set the GEMINI_API_KEY environment variable');
    return;
  }

  const model = 'gemma-3n-e4b-it';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Define the function that the model can call
  const tools = [
    {
      functionDeclarations: [
        {
          name: 'getWeather',
          description: 'Get the current weather in a given location',
          parameters: {
            type: 'OBJECT',
            properties: {
              location: {
                type: 'STRING',
                description:
                  'The city and state, e.g. San Francisco, CA or Paris, France',
              },
            },
            required: ['location'],
          },
        },
      ],
    },
  ];

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `What's the weather like in Paris today?`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
    tools: tools,
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      return;
    }

    const data = await response.json();

    // Check if function call is in the response
    if (
      data.candidates &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0].functionCall
    ) {
      const functionCall = data.candidates[0].content.parts[0].functionCall;
      console.log('Function call detected:', functionCall.name);

      if (functionCall.name === 'getWeather') {
        const location = functionCall.args.location;
        const weatherResult = getWeather(location);

        // Send a follow-up request with the function results
        const followUpRequest = {
          contents: [
            ...requestBody.contents,
            {
              role: 'model',
              parts: [
                {
                  functionCall: functionCall,
                },
              ],
            },
            {
              role: 'function',
              parts: [
                {
                  functionResponse: {
                    name: functionCall.name,
                    response: { result: weatherResult },
                  },
                },
              ],
            },
          ],
          generationConfig: requestBody.generationConfig,
        };

        const followUpResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(followUpRequest),
        });

        if (!followUpResponse.ok) {
          const errorData = await followUpResponse.json();
          console.error('Follow-up API Error:', errorData);
          return;
        }

        const followUpData = await followUpResponse.json();
        console.log(
          'Final Response:',
          followUpData.candidates[0].content.parts[0].text
        );
      }
    } else {
      // If no function call, just display the text response
      console.log('Text Response:', data.candidates[0].content.parts[0].text);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## 38. prototype/mcp/servers/notion/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  $.verbose = true;

  await cd('app');

  await $``;
}
```

## 39. prototype/mcp/servers/run/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  $.verbose = true;

  await cd('app');

  await $``;
}
```

## 40. prototype/examples/app/src/main.ts

````ts
#!/usr/bin/env -S deno run --allow-read --allow-write

import {
  join,
  basename,
  relative,
  sep,
} from 'https://deno.land/std@0.208.0/path/mod.ts';
import { existsSync } from 'https://deno.land/std@0.208.0/fs/mod.ts';

// Environment variables with defaults
const TARGET_DIRECTORY =
  Deno.env.get('TARGET_DIRECTORY') || '/Users/francoisseguin/projects/';
const OUTPUT_FILE = Deno.env.get('OUTPUT_FILE') || 'Examples.md';

// Common directories and files to ignore
const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.nyc_output',
  'logs',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local',
  '/Users/francoisseguin/projects/container/run',
  '**/dev',
];

/**
 * Check if a path should be ignored
 */
function shouldIgnore(filePath: string): boolean {
  const name = basename(filePath);
  return IGNORE_PATTERNS.some((pattern) => {
    if (pattern.includes('*')) {
      if (pattern.startsWith('**/')) {
        // Handle **/dirname pattern - check if path contains /dirname/
        const dirName = pattern.replace('**/', '');
        return (
          filePath.includes(sep + dirName + sep) ||
          filePath.includes(sep + dirName)
        );
      } else {
        // Handle *.extension pattern
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(name);
      }
    }
    return (
      name === pattern ||
      filePath.includes(sep + pattern + sep) ||
      filePath === pattern
    );
  });
}

/**
 * Recursively get all .ts files from a directory
 */
async function getAllTsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    for await (const dirEntry of Deno.readDir(dir)) {
      const fullPath = join(dir, dirEntry.name);

      if (shouldIgnore(fullPath)) {
        continue;
      }

      if (dirEntry.isDirectory) {
        files.push(...(await getAllTsFiles(fullPath)));
      } else if (dirEntry.isFile && dirEntry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }

  return files;
}

/**
 * Check if a file contains "CustomArgs"
 */
async function containsCustomArgs(filePath: string): Promise<boolean> {
  try {
    const content = await Deno.readTextFile(filePath);
    return content.includes('CustomArgs');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Get the content of a file
 */
async function getFileContent(filePath: string): Promise<string> {
  try {
    return await Deno.readTextFile(filePath);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return `// Error reading file: ${error.message}`;
  }
}

/**
 * Create Examples.md file
 */
async function createExamplesFile(matchingFiles: string[]): Promise<void> {
  let content = '# Examples\n\n';

  if (matchingFiles.length === 0) {
    content += 'No TypeScript files containing "CustomArgs" were found.\n';
  } else {
    content += `Found ${matchingFiles.length} TypeScript file(s) containing "CustomArgs":\n\n`;

    for (let i = 0; i < matchingFiles.length; i++) {
      const filePath = matchingFiles[i];
      const relativePath = relative(TARGET_DIRECTORY, filePath);
      const fileContent = await getFileContent(filePath);

      content += `## ${i + 1}. ${relativePath}\n\n`;
      content += '```ts\n';
      content += fileContent;
      content += '\n```\n\n';
    }
  }

  try {
    await Deno.writeTextFile(OUTPUT_FILE, content);
    console.log(`${OUTPUT_FILE} has been created successfully!`);
  } catch (error) {
    console.error(`Error writing ${OUTPUT_FILE}:`, error.message);
  }
}

/**
 * Main function - exported as default for Deno script framework
 */
export default async function main(): Promise<void> {
  console.log('Searching for TypeScript files containing "CustomArgs"...');
  console.log(`Target directory: ${TARGET_DIRECTORY}`);
  console.log(`Output file: ${OUTPUT_FILE}`);

  // Check if target directory exists
  if (!existsSync(TARGET_DIRECTORY)) {
    console.error(`Directory does not exist: ${TARGET_DIRECTORY}`);
    Deno.exit(1);
  }

  // Get all .ts files
  console.log('Finding all TypeScript files...');
  const allTsFiles = await getAllTsFiles(TARGET_DIRECTORY);
  console.log(`Found ${allTsFiles.length} TypeScript files`);

  // Filter files containing "CustomArgs"
  console.log('Filtering files containing "CustomArgs"...');
  const matchingFiles: string[] = [];

  for (const file of allTsFiles) {
    if (await containsCustomArgs(file)) {
      matchingFiles.push(file);
    }
  }

  console.log(`Found ${matchingFiles.length} files containing "CustomArgs"`);

  // Print matching files
  if (matchingFiles.length > 0) {
    console.log('\nMatching files:');
    matchingFiles.forEach((file, index) => {
      const relativePath = relative(TARGET_DIRECTORY, file);
      console.log(`  ${index + 1}. ${relativePath}`);
    });
  }

  // Create Examples.md
  await createExamplesFile(matchingFiles);
}

// Run the script if this is the main module
if (import.meta.main) {
  await main();
}
````

## 41. container/dvc/scripts/publish.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.2';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  $.verbose = true;

  const SRC = Deno.env.get('SRC');

  const CONTAINER = `${SRC}/container`;

  const tagInstructions = ['-t ghcr.io/ghostmind-dev/dvc:latest'];

  const tagInstructionsString = tagInstructions.join(' ');

  const instructions = `docker buildx build --platform linux/amd64,linux/arm64 ${tagInstructionsString} --push ${CONTAINER}`;

  // transfor the instructions into an array

  const instructionsArray = instructions.split(' ');
  await $`docker buildx create --use`;
  await $`${instructionsArray}`;
}
```

## 42. container/play/actions/gcloud/scripts/build.ts

```ts
import { $, cd } from 'npm:zx';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { utils, currentPath } = opts;

  cd(`${currentPath}/app`);

  const { cmd } = utils;

  await $`bun install`;

  const build = cmd`bun build ./src/main.ts --outdir ./dist --target node`;

  await $`${build}`;
}
```

## 43. container/play/actions/terraform/scripts/build.ts

```ts
import { $, cd } from 'npm:zx';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { utils, currentPath } = opts;

  cd(`${currentPath}/app`);

  const { cmd } = utils;

  await $`bun install`;

  const build = cmd`bun build ./src/main.ts --outdir ./dist --target node`;

  await $`${build}`;
}
```

## 44. container/play/actions/secrets/scripts/build.ts

```ts
import { $, cd } from 'npm:zx';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { utils, currentPath } = opts;

  cd(`${currentPath}/app`);

  const { cmd } = utils;

  await $`bun install`;

  const build = cmd`bun build ./src/main.ts --outdir ./dist --target node`;

  await $`${build}`;
}
```

## 45. container/play/actions/hasura/scripts/build.ts

```ts
import { $, cd } from 'npm:zx';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { utils, currentPath } = opts;

  cd(`${currentPath}/app`);

  const { cmd } = utils;

  await $`bun install`;

  const build = cmd`bun build ./src/main.ts --outdir ./dist --target node`;

  await $`${build}`;
}
```

## 46. container/play/actions/env/scripts/build.ts

```ts
import { $, cd } from 'npm:zx';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { utils, currentPath } = opts;

  cd(`${currentPath}/app`);

  const { cmd } = utils;

  await $`bun install`;

  const build = cmd`bun build ./src/main.ts --outdir ./dist --target node`;

  await $`${build}`;
}
```

## 47. container/play/actions/run/scripts/build.ts

```ts
import { $, cd } from 'npm:zx';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { utils, currentPath } = opts;

  cd(`${currentPath}/app`);

  const { cmd } = utils;

  await $`bun install`;

  const build = cmd`bun build ./src/main.ts --outdir ./dist --target node`;

  await $`${build}`;
}
```

## 48. container/play/actions/vault/scripts/build.ts

```ts
import { $, cd } from 'npm:zx';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { utils, currentPath } = opts;

  cd(`${currentPath}/app`);

  const { cmd } = utils;

  await $`bun install`;

  const build = cmd`bun build ./src/main.ts --outdir ./dist --target node`;

  await $`${build}`;
}
```

## 49. ghostmind/explorer/state/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.2';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { main, currentPath } = opts;

  const { dockerRegister, terraformActivate } = main;

  await dockerRegister({
    amd64: true,
  });

  await terraformActivate({
    component: 'core',
    arch: 'amd64',
    docker: 'default',
  });

  cd(`${currentPath}/app/state`);

  const HASURA_GRAPHQL_ENDPOINT = Deno.env.get('HASURA_GRAPHQL_ENDPOINT');

  await $`hasura migrate apply --endpoint ${HASURA_GRAPHQL_ENDPOINT} --database-name default`;

  await $`hasura metadata apply --endpoint ${HASURA_GRAPHQL_ENDPOINT}`;
}
```

## 50. ghostmind/explorer/state/scripts/test.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, sleep } from 'npm:zx@8.1.3';
import { gql, GraphQLClient } from 'npm:graphql-request@7.1.0';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const endpoint_login = Deno.env.get('DB_POTION_ENDPOINT') as string;

  const endpoint_secret = Deno.env.get('DB_POTION_SECRET') as string;

  const graphQLClient = new GraphQLClient(endpoint_login, {
    headers: {
      'X-Hasura-Admin-Secret': endpoint_secret,
    },
  });

  const sendRequest = gql`
    query MyQuery {
      articles(limit: 1) {
        id
      }
    }
  `;

  const response = await graphQLClient.request(sendRequest);

  console.log(response);
}
```

## 51. ghostmind/explorer/state/scripts/metadata.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.2';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { currentPath } = opts;

  cd(`${currentPath}/app/state`);

  const HASURA_GRAPHQL_ENDPOINT = Deno.env.get('HASURA_GRAPHQL_ENDPOINT');

  console.log(HASURA_GRAPHQL_ENDPOINT);
  await $`hasura metadata apply --endpoint ${HASURA_GRAPHQL_ENDPOINT}`;
}
```

## 52. ghostmind/explorer/client/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister, terraformActivate } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { start } = opts;

  await start({
    register: {
      command: dockerRegister,
      priority: 998,
      options: {
        amd64: true,
      },
    },
    activate: {
      command: terraformActivate,
      options: {
        component: 'core',
        arch: 'amd64',
      },
    },
  });
}
```

## 53. ghostmind/explorer/client/scripts/test.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { fetch } from 'npm:zx@8.1.2';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { url, port, has } = opts;
  const { tunnel, local } = url;

  if (has('tunnel')) {
    try {
      await fetch(tunnel);
      console.log('Tunnel is up and running');
    } catch (error) {
      console.error('Tunnel is down');
    }
  }

  if (has('local')) {
    try {
      await fetch(`${local}:${port}`);
      console.log('Local server is up and running');
    } catch (error) {
      console.error('Local server is down');
    }
  }
}
```

## 54. ghostmind/users/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.2';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  const { main, run, currentPath } = opts;

  const { dockerRegister, terraformActivate } = main;

  await dockerRegister({
    amd64: true,
  });

  await terraformActivate({
    component: 'core',
    arch: 'amd64',
    docker: 'default',
  });

  cd(`${currentPath}/state`);

  const HASURA_GRAPHQL_ENDPOINT = Deno.env.get('HASURA_GRAPHQL_ENDPOINT');

  await $`hasura migrate apply --endpoint ${HASURA_GRAPHQL_ENDPOINT} --database-name default`;

  await $`hasura metadata apply --endpoint ${HASURA_GRAPHQL_ENDPOINT}`;
}
```

## 55. ghostmind/worker/test/youtube.ts

```ts
import { fetch } from 'npm:zx';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

// Regular HTTP endpoint
export default async function (arg: CustomArgs, opts: CustomOptions) {
  const { env } = opts;

  const DOMAIN_API = Deno.env.get('DOMAIN_API');

  const subject = arg[0];

  const convert = await fetch(`https://${DOMAIN_API}/youtube-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: env.API_KEY,
    },
    body: JSON.stringify({
      subject: subject,
    }),
  });

  const resultConvert = await convert.json();
  console.log(resultConvert);
}
```

## 56. ghostmind/worker/test/describe.ts

```ts
import { fetch } from 'npm:zx';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

// Regular HTTP endpoint
export default async function (arg: CustomArgs, opts: CustomOptions) {
  const { env } = opts;

  const DOMAIN_API = Deno.env.get('DOMAIN_API');

  const url = arg[0];

  const convert = await fetch(`https://${DOMAIN_API}/describe-ui`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: env.API_KEY,
    },
    body: JSON.stringify({
      url: url,
      llm_model: arg[2] || 'gpt-4o-mini',
    }),
  });

  const resultConvert = await convert.json();
  console.log(resultConvert);
}
```

## 57. ghostmind/worker/local/scripts/deploy.ts

```ts
import { dockerComposeBuild, dockerComposeUp } from 'jsr:@ghostmind/run';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.0/core';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  const { currentPath, start } = opts;

  $.verbose = true;

  const cluster = arg[0];

  cd(currentPath);

  if (cluster === 'kind') {
    await $`${[
      'skaffold',
      'run',
      '--filename=local/kind.yaml',
      '--cache-artifacts=false',
      '--digest-source=local',
    ]}`;
  }

  if (cluster === 'minikube') {
    await $`${[
      'skaffold',
      'run',
      '--cache-artifacts=false',
      '--filename=local/minikube.yaml',
    ]}`;
  }
}
```

## 58. ghostmind/worker/gke/scripts/activate.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd, sleep } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { run, currentPath } = opts;

  cd(`${currentPath}`);

  $.verbose = true;

  await $`run terraform activate registry`;

  await $`run terraform activate worker`;

  await $`run terraform activate cluster`;

  await sleep(5000);

  await $`run custom connect -r gke`;
}
```

## 59. ghostmind/worker/gke/scripts/connect.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const PROJECT = Deno.env.get('PROJECT');
  const ENV = Deno.env.get('ENV');
  const CLUSTER_NAME = `${PROJECT}-${ENV}`;

  await $`${[
    'gcloud',
    'container',
    'clusters',
    'get-credentials',
    CLUSTER_NAME,
    '--region=northamerica-northeast1',
  ]}`;
}
```

## 60. ghostmind/worker/gke/scripts/deploy.ts

```ts
import { dockerComposeBuild, dockerComposeUp } from 'jsr:@ghostmind/run';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.0/core';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  const { currentPath, start } = opts;

  $.verbose = true;

  cd(currentPath);

  await $`${[
    'skaffold',
    'run',
    '--filename=gke/skaffold.yaml',
    '--cache-artifacts=true',
  ]}`;
}
```

## 61. ghostmind/worker/creds/scripts/writer.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  $.verbose = true;

  const { currentPath } = opts;

  cd(`${currentPath}`);

  const ENV = Deno.env.get('ENVIRONMENT');

  await $`run terraform activate registry`;

  await $`rm -rf /tmp/registry-access-key.json`;

  await cd('creds/registry');

  await $`terraform output -raw service_account_key | base64 -d > /tmp/registry-access-key.json`;

  //   // Delete existing secret if it exists
  await $`kubectl delete secret registry-secret --ignore-not-found`;

  const key = await $`cat /tmp/registry-access-key.json`;

  await $`${[
    'kubectl',
    'create',
    'secret',
    'docker-registry',
    'registry-secret',
    '--docker-server=https://gcr.io',
    '--docker-username=_json_key',
    `--docker-email=worker-${ENV}@ghostmind-core.iam.gserviceaccount.com`,
    `--docker-password=${key}`,
  ]}`;
}
```

## 62. ghostmind/worker/creds/scripts/secrets.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, _opts: CustomOptions) {
  $.verbose = true;

  const ENV = Deno.env.get('ENVIRONMENT');
  const PROJECT = Deno.env.get('PROJECT');
  const secretName = `${PROJECT}-secrets`;

  try {
    // Verify if the secret exists
    await $`kubectl get secret ${secretName} -n default`;
    // If found, delete it
    await $`kubectl delete secret ${secretName} -n default`;
  } catch {
    // Secret does not exist; nothing to delete
  }

  // Create secret from .env.${ENV}
  await $`kubectl create secret generic ${secretName} -n default --from-env-file=.env.${ENV}`;
  $.verbose = true;
}
```

## 63. ghostmind/worker/routes/scripts/routes.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';
import yamlReader from 'npm:js-yaml@4.1.0';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  $.verbose = true;

  const DOMAIN_BROWSER = Deno.env.get('DOMAIN_BROWSER');
  const DOMAIN_API = Deno.env.get('DOMAIN_API');

  const httpRouteObjects = [
    {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'HTTPRoute',
      metadata: {
        name: 'browser-route',
        namespace: 'default',
      },
      spec: {
        parentRefs: [
          {
            name: 'gateway',
            namespace: 'cloudflare-gateway',
          },
        ],
        hostnames: [DOMAIN_BROWSER],
        rules: [
          {
            backendRefs: [
              {
                name: 'worker',
                namespace: 'default',
                port: 6080,
              },
            ],
          },
        ],
      },
    },
    {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'HTTPRoute',
      metadata: {
        name: 'api-route',
        namespace: 'default',
      },
      spec: {
        parentRefs: [
          {
            name: 'gateway',
            namespace: 'cloudflare-gateway',
          },
        ],
        hostnames: [DOMAIN_API],
        rules: [
          {
            backendRefs: [
              {
                name: 'worker',
                namespace: 'default',
                port: 5001,
              },
            ],
          },
        ],
      },
    },
  ];

  // Instead of directly dumping the array, we need to properly format each document
  const httpRouteYaml = httpRouteObjects
    .map((route) => yamlReader.dump(route))
    .join('---\n');

  await $`echo ${httpRouteYaml} | kubectl apply -f -`;
}
```

## 64. ghostmind/worker/routes/scripts/gateway.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd, sleep } from 'npm:zx@8.1.3';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  const { run, currentPath, has } = opts;

  cd(`${currentPath}`);

  $.verbose = true;

  const CLOUDFLARED_ACCOUNT_ID = Deno.env.get('CLOUDFLARED_ACCOUNT_ID');
  const CLOUDFLARED_API_KEY = Deno.env.get('CLOUDFLARED_API_KEY');

  await $`kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml`;

  await sleep(5000);

  await $`kubectl apply -k "github.com/pl4nty/cloudflare-kubernetes-gateway//config/default?ref=v0.8.1"`;

  // Check if secret exists and delete it
  const secretExists =
    await $`kubectl get secret -n cloudflare-gateway cloudflare 2>/dev/null || echo "not found"`;
  if (!secretExists.stdout.includes('not found')) {
    await $`kubectl delete secret -n cloudflare-gateway cloudflare`;
  }

  await $`${[
    'kubectl',
    'create',
    'secret',
    '-n',
    'cloudflare-gateway',
    'generic',
    'cloudflare',
    `--from-literal=ACCOUNT_ID=${CLOUDFLARED_ACCOUNT_ID}`,
    `--from-literal=TOKEN=${CLOUDFLARED_API_KEY}`,
  ]}`;

  await $`kubectl apply -f routes/gatewayClass.yaml`;
  await $`kubectl apply -f routes/gateway.yaml`;
}
```

## 65. ghostmind/potion/utils/tmux.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  $.verbose = true;

  const NAME = 'dev';
  const SRC = Deno.env.get('SRC')!;

  // Ensure tmux socket directory exists with correct permissions
  await $`mkdir -p /tmp/tmux-1000`;
  await $`chmod 700 /tmp/tmux-1000`;

  // Start tmux server explicitly
  await $`tmux start-server`;

  // Kill existing session if it exists
  try {
    await $`tmux kill-session -t ${NAME}`;
  } catch (e) {
    // Ignore error if session doesn't exist
  }

  // Create new detached session
  await $`tmux new-session -d -s ${NAME} -n ui && tmux send-keys -t "${NAME}:0" "${SRC}/potion/ui" 'clear' C-m`;

  // Wait for session to initialize
  // await new Promise((resolve) => setTimeout(resolve, 2000));

  // // Now send keys to each window
  // await $`tmux send-keys -t "${NAME}:0" "${SRC}/potion/ui" 'clear' C-m`;

  // // Create second window and send keys
  // await $`tmux new-window -t ${NAME}:1 -n pocket`;
  // await $`tmux send-keys -t "${NAME}:1" "${SRC}/potion/pocket" 'clear' C-m`;

  // Create third window and send keys
  // await $`tmux new-window -t ${NAME}:2 -n notion`;
  // await $`tmux send-keys -t "${NAME}:2" "${SRC}/potion/notion" 'clear' C-m`;

  // Select first window
  await $`tmux select-window -t ${NAME}:0`;

  console.log('Tmux session created. Connect to it with: tmux attach -t dev');
}
```

## 66. ghostmind/potion/potion/kindle/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister, terraformActivate } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { start } = opts;

  await start({
    register: {
      command: dockerRegister,
      priority: 998,
      options: {
        amd64: true,
      },
    },
    activate: {
      command: terraformActivate,
      options: {
        component: 'core',
        arch: 'amd64',
      },
    },
  });
}
```

## 67. ghostmind/potion/potion/kindle/scripts/test.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  const { currentPath, has } = opts;

  cd(`${currentPath}/app`);

  $.verbose = true;

  if (has('local_remote')) {
    Deno.env.set('TESTING_MODE', 'local_remote');
  }

  if (has('send')) {
    await $`deno test --allow-all test/send.ts`;
  }
}
```

## 68. ghostmind/potion/potion/pocket/scripts/trigger.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';
import { ExecutionsClient } from 'npm:@google-cloud/workflows@3.4.0';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  $.verbose = true;

  const { currentPath } = opts;

  cd(currentPath);

  // const client = new ExecutionsClient();

  // const GCP_PROJECT_ID = Deno.env.get('GCP_PROJECT_ID') || '';
  // const location = 'us-central1';
  // const PROJECT = Deno.env.get('PROJECT');
  // const APP = Deno.env.get('APP');
  // const ENV = Deno.env.get('ENV');
  // const WORKFLOW_NAME = `${PROJECT}-${ENV}-${APP}`;

  // try {
  //   const createExecutionRes = await client.createExecution({
  //     parent: client.workflowPath(GCP_PROJECT_ID, location, WORKFLOW_NAME),
  //     execution: {
  //       argument: JSON.stringify({ user_id: Deno.env.get('TEST_USER_ID') }),
  //     },
  //   });

  //   const executionName = createExecutionRes[0].name;
  //   console.log(`Workflow execution started: ${executionName}`);

  //   // Polling the execution status
  //   let done = false;
  //   while (!done) {
  //     const [execution] = await client.getExecution({ name: executionName });

  //     if (execution.state === 'ACTIVE') {
  //       console.log(`Execution is still running...`);
  //     } else if (execution.state === 'SUCCEEDED') {
  //       console.log(`Execution succeeded with result: ${execution.result}`);
  //       done = true;
  //     } else if (
  //       execution.state === 'FAILED' ||
  //       execution.state === 'CANCELLED'
  //     ) {
  //       console.error(`Execution failed with error: ${execution.error}`);
  //       done = true;
  //     }

  //     // Wait for a few seconds before polling again
  //     await new Promise((resolve) => setTimeout(resolve, 5000));
  //   }
  // } catch (error) {
  //   console.error('Error during fetch:', error);
  //   if (error instanceof TypeError) {
  //     console.error('TypeError details:', error.message);
  //   }
  // }
}
```

## 69. ghostmind/potion/potion/pocket/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister, terraformActivate } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { start } = opts;

  await start({
    register: {
      command: dockerRegister,
      priority: 997,
      options: {
        amd64: true,
      },
    },
    activate: {
      command: terraformActivate,
      priority: 998,
      options: {
        component: 'run',
        arch: 'amd64',
      },
    },
    workflow: {
      command: terraformActivate,
      options: {
        component: 'workflow',
      },
    },
  });
}
```

## 70. ghostmind/potion/potion/pocket/scripts/type.ts

```ts
import type { CustomArgs, CustomOptions } from '../../../dev/run/main.ts';
import { $ } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { test } = opts;

  console.log(test);
}
```

## 71. ghostmind/potion/potion/pocket/scripts/test.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  const { currentPath, has, test } = opts;

  cd(`${currentPath}/app`);

  $.verbose = true;

  // Deno.env.set(
  //   'TARGET',
  //   test
  //     ? 'http://host.docker.internal:5070'
  //     : (Deno.env.get('TUNNEL_URL') as string)
  // );

  // if (has('update')) {
  //   await $`deno test --allow-all test/update.ts`;
  // }
}
```

## 72. ghostmind/potion/potion/ui/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister, terraformActivate } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { start } = opts;

  await start({
    register: {
      command: dockerRegister,
      priority: 998,
      options: {
        amd64: true,
      },
    },
    activate: {
      command: terraformActivate,
      options: {
        component: 'core',
        arch: 'amd64',
      },
    },
  });
}
```

## 73. ghostmind/potion/potion/ui/scripts/test.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { fetch } from 'npm:zx@8.1.2';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { url, port, has } = opts;
  const { tunnel, local } = url;

  if (has('tunnel')) {
    try {
      await fetch(tunnel);
      console.log('Tunnel is up and running');
    } catch (error) {
      console.error('Tunnel is down');
    }
  }

  if (has('local')) {
    try {
      await fetch(`${local}:${port}`);
      console.log('Local server is up and running');
    } catch (error) {
      console.error('Local server is down');
    }
  }
}
```

## 74. ghostmind/potion/potion/state/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.2';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { main, currentPath } = opts;

  const { dockerRegister, terraformActivate } = main;

  await dockerRegister({
    amd64: true,
  });

  await terraformActivate({
    component: 'core',
    arch: 'amd64',
    docker: 'default',
  });

  cd(`${currentPath}/app/state`);

  const HASURA_GRAPHQL_ENDPOINT = Deno.env.get('HASURA_GRAPHQL_ENDPOINT');

  await $`hasura migrate apply --endpoint ${HASURA_GRAPHQL_ENDPOINT} --database-name default`;

  await $`hasura metadata apply --endpoint ${HASURA_GRAPHQL_ENDPOINT}`;
}
```

## 75. ghostmind/potion/potion/state/scripts/test.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, sleep } from 'npm:zx@8.1.3';
import { gql, GraphQLClient } from 'npm:graphql-request@7.1.0';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const endpoint_login = Deno.env.get('DB_POTION_ENDPOINT') as string;

  const endpoint_secret = Deno.env.get('DB_POTION_SECRET') as string;

  const graphQLClient = new GraphQLClient(endpoint_login, {
    headers: {
      'X-Hasura-Admin-Secret': endpoint_secret,
    },
  });

  const sendRequest = gql`
    query MyQuery {
      articles(limit: 1) {
        id
      }
    }
  `;

  const response = await graphQLClient.request(sendRequest);

  console.log(response);
}
```

## 76. ghostmind/potion/potion/notion/scripts/trigger.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';
import { ExecutionsClient } from 'npm:@google-cloud/workflows@3.4.0';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  $.verbose = true;

  const { currentPath } = opts;

  cd(currentPath);

  const client = new ExecutionsClient({ fallback: true });

  const GCP_PROJECT_ID = Deno.env.get('GCP_PROJECT_ID') || '';
  const location = Deno.env.get('WORKFLOW_REGION') || 'us-central1';
  const WORKFLOW_NAME = Deno.env.get('WORKFLOW_NAME') || '';

  try {
    const createExecutionRes = await client.createExecution({
      parent: client.workflowPath(GCP_PROJECT_ID, location, WORKFLOW_NAME),
      execution: {
        argument: JSON.stringify({ user_id: Deno.env.get('TEST_USER_ID') }),
      },
    });

    const executionName = createExecutionRes[0].name;
    console.log(`Workflow execution started: ${executionName}`);

    // Polling the execution status
    let done = false;
    while (!done) {
      const [execution] = await client.getExecution({ name: executionName });

      if (execution.state === 'ACTIVE') {
        console.log(`Execution is still running...`);
      } else if (execution.state === 'SUCCEEDED') {
        console.log(`Execution succeeded with result: ${execution.result}`);
        done = true;
      } else if (
        execution.state === 'FAILED' ||
        execution.state === 'CANCELLED'
      ) {
        console.log(execution.error);
        console.error(`Execution failed with error: ${execution.error}`);
        done = true;
      }

      // Wait for a few seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  } catch (error) {
    console.error('Error during fetch:', error);
    if (error instanceof TypeError) {
      console.error('TypeError details:', error.message);
    }
  }
}
```

## 77. ghostmind/potion/potion/notion/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister, terraformActivate } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { start } = opts;

  await start({
    register: {
      command: dockerRegister,
      priority: 997,
      options: {
        amd64: true,
      },
    },
    run: {
      command: terraformActivate,
      priority: 998,
      options: {
        component: 'run',
        arch: 'amd64',
      },
    },
    workflow: {
      command: terraformActivate,
      options: {
        component: 'workflow',
      },
    },
  });
}
```

## 78. ghostmind/potion/potion/notion/scripts/workflow.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { terraformActivate } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { start } = opts;

  await start({
    workflow: {
      command: terraformActivate,
      options: {
        component: 'workflow',
      },
    },
  });
}
```

## 79. ghostmind/potion/potion/notion/scripts/test.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  const { currentPath, has } = opts;

  cd(`${currentPath}/app`);

  $.verbose = true;

  if (!has('all')) {
    await $`deno test --allow-all test/test.ts --filter ${arg}`;
    return;
  }

  await $`deno test --allow-all test/test.ts`;
}
```

## 80. ghostmind/potion/potion/chrome/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister, terraformActivate } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { start } = opts;

  await start({
    register: {
      command: dockerRegister,
      priority: 998,
      options: {
        amd64: true,
      },
    },
    activate: {
      command: terraformActivate,
      options: {
        component: 'core',
        arch: 'amd64',
      },
    },
  });
}
```

## 81. ghostmind/potion/potion/chrome/scripts/test.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  const { currentPath, has } = opts;

  cd(`${currentPath}/app`);

  $.verbose = true;

  if (has('local_remote')) {
    Deno.env.set('TESTING_MODE', 'local_remote');
  }

  if (has('get')) {
    await $`deno test --allow-all --no-npm test/test_get.ts`;
  }
}
```

## 82. ghostmind/potion/potion/relay/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { dockerRegister, terraformActivate } from 'jsr:@ghostmind/run';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { start } = opts;

  await start({
    register: {
      command: dockerRegister,
      priority: 997,
      options: {
        amd64: true,
      },
    },
    run: {
      command: terraformActivate,
      priority: 998,
      options: {
        component: 'run',
        arch: 'amd64',
      },
    },
  });
}
```

## 83. ghostmind/potion/potion/relay/scripts/test.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  const { currentPath, has } = opts;

  cd(`${currentPath}/app`);

  $.verbose = true;

  if (!has('all')) {
    await $`deno test --allow-all test/test.ts --filter ${arg}`;
    return;
  }

  await $`deno test --allow-all test/test.ts`;
}
```

## 84. ghostmind/vault/scripts/init.ts

```ts
import { $, sleep } from 'npm:zx';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

////////////////////////////////////////////////////////////////////////////////
// MAIN
////////////////////////////////////////////////////////////////////////////////

export default async function init(_arg: CustomArgs, options: CustomOptions) {
  const { run } = options;

  await $`${run} docker register vault --amd64`;

  await $`${run} terraform activate operator`;

  await $`${run}  terraform activate bucket`;

  await $`${run}  terraform activate kms`;

  await $`${run} terraform activate core --arch=amd64`;

  console.log('Vault is ready');
}

////////////////////////////////////////////////////////////////////////////////
// THE END
////////////////////////////////////////////////////////////////////////////////
```

## 85. ghostmind/vault/scripts/unseal.ts

```ts
import { $, sleep, fs } from 'npm:zx';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

////////////////////////////////////////////////////////////////////////////////
// MAIN
////////////////////////////////////////////////////////////////////////////////

export default async function init(_arg: CustomArgs, options: CustomOptions) {
  const { main } = options;

  const { getAppName } = main;

  const { writeFile } = fs;

  $.verbose = true;

  const ENVIRONMENT = Deno.env.get('ENVIRONMENT');
  const APP = await getAppName();
  const SERVICE = `vault-${ENVIRONMENT}-${APP}`;

  const VAULT_URL =
    await $`gcloud run services describe ${SERVICE} --platform managed --region us-central1  --format 'value(status.url)'`;

  const SEAL_STATUS =
    await $`curl -s -X GET ${VAULT_URL}/v1/sys/seal-status -H "Authorization: Bearer $(gcloud auth print-identity-token)"`;

  const { stdout: SERVER_STATUS } = SEAL_STATUS;

  const { sealed } = JSON.parse(SERVER_STATUS);

  let root_token;

  if (sealed === true) {
    // Initialize Vault
    const initData = {
      stored_shares: 1,
      recovery_shares: 1,
      recovery_threshold: 1,
      recovery_pgp_keys: [],
    };
    await writeFile('/tmp/init.json', JSON.stringify(initData));
    const unsealRequestRaw =
      await $`curl -s -X PUT ${VAULT_URL}/v1/sys/init -H "Authorization: Bearer $(gcloud auth print-identity-token)" --data @/tmp/init.json`;

    const rootKeyJson = JSON.parse(`${unsealRequestRaw}`);
    root_token = rootKeyJson.root_token;
    await $`rm /tmp/init.json`;
  }

  await sleep(2000);

  $.verbose = false;
}

////////////////////////////////////////////////////////////////////////////////
// THE END
////////////////////////////////////////////////////////////////////////////////
```

## 86. ghostmind/vault/scripts/destroy.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { run } = opts;

  await $`${run} terraform destroy core`;

  await $`${run}  terraform destroy bucket`;

  await $`${run} terraform destroy operator`;

  const SECRET_ID = Deno.env.get('SECRET_ID');

  await $`gcloud secrets delete ${SECRET_ID} --quiet`;
}
```

## 87. ghostmind/vault/scripts/update.ts

```ts
import createSecret from './secret.ts';
import { $ } from 'npm:zx';
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';

////////////////////////////////////////////////////////////////////////////////
// MAIN
////////////////////////////////////////////////////////////////////////////////

export default async function init(arg: CustomArgs, options: CustomOptions) {
  const { run } = options;

  $.verbose = true;

  await $`${run} docker register vault --amd64`;

  await createSecret();

  await $`${run} terraform activate core --arch=amd64`;
}

////////////////////////////////////////////////////////////////////////////////
// THE END
////////////////////////////////////////////////////////////////////////////////
```

## 88. ghostmind/budget/training/scripts/upload-file.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import fs from 'node:fs';
import fetch from 'npm:node-fetch@4.0.0-beta.4';
import OpenAI from 'npm:openai@4.71.1';
import { Blob, Buffer } from 'node:buffer';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { currentPath } = opts;

  const openai = new OpenAI();

  const formData = new FormData();
  formData.append('purpose', 'fine-tune');

  const fileStream = fs.createReadStream(
    `${currentPath}/.data/training_data.jsonl`
  );
  const chunks: Buffer[] = [];
  fileStream.on('data', (chunk: Buffer) => chunks.push(chunk));
  fileStream.on('end', async () => {
    const fileBuffer = Buffer.concat(chunks);
    const fileBlob = new Blob([fileBuffer]);
    formData.append('file', fileBlob, 'machine-meta-training');

    const response = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    const result = await response.json();
    console.log(result);
  });
  fileStream.on('error', (err) => {
    console.error('Error reading file:', err);
  });
}
```

## 89. ghostmind/budget/training/scripts/fine-tune.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import OpenAI from 'npm:openai@4.71.1';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const MODEL_NAME = Deno.env.get('MODEL_NAME')!;
  const TRAINING_DATA_ID = Deno.env.get('TRAINING_FILE_ID')!;

  const openai = new OpenAI();

  const fineTune = await openai.fineTuning.jobs.create({
    training_file: TRAINING_DATA_ID,
    model: MODEL_NAME,
  });

  console.log(fineTune);
}
```

## 90. ghostmind/budget/training/scripts/prepare-data.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, fs } from 'npm:zx@8.1.3';

////////////////////////////////////////////////////////////
// TYPES
////////////////////////////////////////////////////////////

interface Transaction {
  description: string;
  amount: number;
  source: string;
  date: string;
}

interface Product {
  name: string;
  format: string;
  tags: string;
  notes: string;
  frequency: 'monthly' | 'yearly' | 'bi-monthly' | 'non-recurrent';
}

interface TransactionMatch {
  TRANSACTION_ID: string;
  MATCHING_PRODUCT_ID: string;
}

interface AccountingData {
  transactions: Record<string, Transaction>;
  products: Record<string, Product>;
  final_matches: TransactionMatch[];
}

interface TrainingData {
  messages: Message[];
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

////////////////////////////////////////////////////////////
// MAIN
////////////////////////////////////////////////////////////

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { currentPath } = opts;

  await $`rm -rf ${currentPath}/.data/training_data.jsonl`;

  const dir = await fs.opendir(`${currentPath}/.data`);
  const fileStream = await fs.createWriteStream(
    `${currentPath}/.data/training_data.jsonl`,
    { flags: 'w' }
  );

  for await (const file of dir) {
    const filePath = `${currentPath}/.data/${file.name}`;
    try {
      const rawData = await fs.readFile(filePath, 'utf-8');
      const parsedData = JSON.parse(rawData);

      const trainingData = {
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that converts unstructured data into structured data and matches transactions to products.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              transactions: parsedData.transactions,
              products: parsedData.products,
            }),
          },
          {
            role: 'assistant',
            content: JSON.stringify(parsedData.final_matches),
          },
        ],
      };

      // Only remove structural whitespace
      const jsonLine = JSON.stringify(trainingData)
        .replace(/"\s*:\s*/g, '":') // Remove spaces around colons
        .replace(/\s*,\s*/g, ',') // Remove spaces around commas
        .replace(/\s*{\s*/g, '{') // Remove spaces around opening braces
        .replace(/\s*}\s*/g, '}') // Remove spaces around closing braces
        .replace(/\s*\[\s*/g, '[') // Remove spaces around opening brackets
        .replace(/\s*\]\s*/g, ']'); // Remove spaces around closing brackets

      fileStream.write(jsonLine + '\n');
    } catch (error) {
      console.error('Error processing file:', file.name, error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack:', error.stack);
      }
    }
  }

  fileStream.end();
}

////////////////////////////////////////////////////////////
// ENTRYPOINT
////////////////////////////////////////////////////////////
```

## 91. ghostmind/budget/budget/scripts/init.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  $.verbose = true;

  const SRC = Deno.env.get('SRC');

  const AGENTS_API_ENDPOINT = Deno.env.get('AGENTS_API_ENDPOINT');
  const AGENTS_API_KEY = Deno.env.get('AGENTS_API_KEY');

  cd(`${SRC}/budget/app`);

  await $`clasp --auth .clasprc.json --project .clasp.json run "setProperty" --params '["AGENTS_API_ENDPOINT", "${AGENTS_API_ENDPOINT}"]'`;
  await $`clasp --auth .clasprc.json --project .clasp.json run "setProperty" --params '["AGENTS_API_KEY", "${AGENTS_API_KEY}"]'`;

  await $`yarn tsc`;
  await $`vite build --mode production && clasp push`;
}
```

## 92. ghostmind/budget/budget/scripts/call.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  const SRC = Deno.env.get('SRC');
  cd(`${SRC}/budget/app`);
  const function_to_call = arg[0];
}
```

## 93. ghostmind/budget/budget/scripts/login.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  const { env } = opts;

  const SRC = Deno.env.get('SRC');

  cd(`${SRC}/budget`);

  const CLASPRC_JSON_PUSH = env['CLASPRC_JSON_PUSH'];
  const CLASPRC_JSON_RUN = env['CLASPRC_JSON_RUN'];
  const CLASP_JSON = env['CLASP_JSON'];

  await $`base64 -di <<< ${CLASPRC_JSON_PUSH} > ~/.clasprc.json`;
  await $`base64 -di <<< ${CLASPRC_JSON_RUN} > ${SRC}/budget/app/.clasprc.json`;
  await $`base64 -di <<< ${CLASP_JSON} > ${SRC}/budget/app/.clasp.json`;

  console.log('Credentials for clasp have been set.');
}
```

## 94. ghostmind/budget/budget/scripts/logs.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $ } from 'npm:zx@8.1.3';

export default async function (_arg: CustomArgs, opts: CustomOptions) {
  $.verbose = false;
  const GCP_PROJECT_NAME = Deno.env.get('GCP_PROJECT_NAME');
  let latestTimestamp: string | null = null;

  // Color codes for different severity levels
  const colors = {
    DEFAULT: '\x1b[0m',
    DEBUG: '\x1b[36m', // Cyan
    INFO: '\x1b[32m', // Green
    NOTICE: '\x1b[34m', // Blue
    WARNING: '\x1b[33m', // Yellow
    ERROR: '\x1b[31m', // Red
    CRITICAL: '\x1b[35m', // Magenta
    ALERT: '\x1b[35;1m', // Bright Magenta
    EMERGENCY: '\x1b[41;1m\x1b[37m', // White on Red background
  };

  // Color for separators
  const SEPARATOR_COLOR = '\x1b[90m'; // Dark gray
  const TIMESTAMP_COLOR = '\x1b[94m'; // Light blue

  while (true) {
    const flags = ['--limit=10', '--format="json"', '--order=desc'];
    const logName = `logName=projects/${GCP_PROJECT_NAME}/logs/script.googleapis.com%2Fconsole_logs`;
    const result = await $`gcloud logging read ${logName} ${flags}`;

    const logs = JSON.parse(result.stdout);
    if (logs.length > 0) {
      const newestEntry = logs[0];
      const timestamp = newestEntry.timestamp;

      if (!latestTimestamp || timestamp > latestTimestamp) {
        console.clear();
        logs.reverse().forEach((log: any) => {
          let message = log.jsonPayload?.message || 'No message';
          if (typeof message === 'string' && message.includes('\n')) {
            message = message.replace(/\n\s*/g, ' ');
          }

          const severity = log.severity || 'DEFAULT';
          const colorCode =
            colors[severity as keyof typeof colors] || colors.DEFAULT;

          // Format timestamp to show just the time (HH:MM:SS)
          let formattedTime = '';
          try {
            const date = new Date(log.timestamp);
            formattedTime = date.toTimeString().split(' ')[0]; // Get just HH:MM:SS
          } catch (e) {
            formattedTime = log.timestamp;
          }

          // Print separator before each log entry
          console.log(`${SEPARATOR_COLOR}${'─'.repeat(50)}${colors.DEFAULT}`);

          // Print formatted log line
          console.log(
            `${TIMESTAMP_COLOR}[${formattedTime}]${colors.DEFAULT} ${colorCode}${severity}${colors.DEFAULT}: ${message}`
          );
        });

        // Final separator
        console.log(`${SEPARATOR_COLOR}${'─'.repeat(50)}${colors.DEFAULT}`);

        latestTimestamp = timestamp;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}
```

## 95. ghostmind/budget/budget/scripts/test.ts

```ts
import type { CustomArgs, CustomOptions } from 'jsr:@ghostmind/run';
import { $, cd } from 'npm:zx@8.1.3';

export default async function (arg: CustomArgs, opts: CustomOptions) {
  const { currentPath, has } = opts;

  cd(`${currentPath}/app`);

  $.verbose = true;

  const func = arg[1];

  if (has('server')) {
    await $`deno test --allow-all test/server.ts --filter ${func}`;
    return;
  }
}
```

---

With these guidelines, an AI agent can reliably generate, validate, and execute custom scripts inside Ghostmind projects using the `run script` command.
