# LLM powered development for VSCode

**llm-vscode** is an extension for all things LLM. It uses [**llm-ls**](https://github.com/huggingface/llm-ls) as its backend.

We also have extensions for:
* [neovim](https://github.com/huggingface/llm.nvim)
* [jupyter](https://github.com/bigcode-project/jupytercoder)
* [intellij](https://github.com/huggingface/llm-intellij)

Previously **huggingface-vscode**.

> [!NOTE]
> When using the Inference API, you will probably encounter some limitations. Subscribe to the *PRO* plan to avoid getting rate limited in the free tier.
>
> https://huggingface.co/pricing#pro

## Features

### Code completion

This plugin supports "ghost-text" code completion, à la Copilot.

### Choose your model

Requests for code generation are made via an HTTP request.

You can use the Hugging Face [Inference API](https://huggingface.co/inference-api) or your own HTTP endpoint, provided it adheres to the APIs listed in [backend](#backend).

The list of officially supported models is located in the config template section.

### Always fit within the context window

The prompt sent to the model will always be sized to fit within the context window, with the number of tokens determined using [tokenizers](https://github.com/huggingface/tokenizers).

### Code attribution

Hit `Cmd+shift+a` to check if the generated code is in [The Stack](https://huggingface.co/datasets/bigcode/the-stack).
This is a rapid first-pass attribution check using [stack.dataportraits.org](https://stack.dataportraits.org).
We check for sequences of at least 50 characters that match a Bloom filter.
This means false positives are possible and long enough surrounding context is necesssary (see the [paper](https://dataportraits.org/) for details on n-gram striding and sequence length).
[The dedicated Stack search tool](https://hf.co/spaces/bigcode/search) is a full dataset index and can be used for a complete second pass. 

## Installation

Install like any other [vscode extension](https://marketplace.visualstudio.com/items?itemName=HuggingFace.huggingface-vscode).

By default, this extension uses [bigcode/starcoder](https://huggingface.co/bigcode/starcoder) & [Hugging Face Inference API](https://huggingface.co/inference-api) for the inference.

#### HF API token

You can supply your HF API token ([hf.co/settings/token](https://hf.co/settings/token)) with this command:
1. `Cmd/Ctrl+Shift+P` to open VSCode command palette
2. Type: `Llm: Login`

If you previously logged in with `huggingface-cli login` on your system the extension will read the token from disk.

## Configuration

You can check the full list of configuration settings by opening your settings page (`cmd+,`) and typing `Llm`.

### Backend

You can configure the backend to which requests will be sent. **llm-vscode** supports the following backends:
- `huggingface`: The Hugging Face Inference API (default)
- `ollama`: [Ollama](https://ollama.com)
- `openai`: any OpenAI compatible API (e.g. [llama-cpp-python](https://github.com/abetlen/llama-cpp-python))
- `tgi`: [Text Generation Inference](https://github.com/huggingface/text-generation-inference)

Let's say your current code is this:
```py
import numpy as np
import scipy as sp
{YOUR_CURSOR_POSITION}
def hello_world():
    print("Hello world")
```

The request body will then look like:
```js
const inputs = `{start token}import numpy as np\nimport scipy as sp\n{end token}def hello_world():\n    print("Hello world"){middle token}`
const data = { inputs, ...configuration.requestBody };

const model = configuration.modelId;
let endpoint;
switch(configuration.backend) {
    // cf URL construction
    let endpoint = build_url(configuration);
}

const res = await fetch(endpoint, {
    body: JSON.stringify(data),
    headers,
    method: "POST"
});

const json = await res.json() as { generated_text: string };
```

Note that the example above is a simplified version to explain what is happening under the hood.

#### URL construction

The endpoint URL that is queried to fetch suggestions is build the following way:
- depending on the backend, it will try to append the correct path to the base URL located in the configuration (e.g. `{url}/v1/completions` for the `openai` backend)
- if no URL is set for the `huggingface` backend, it will automatically use the default URL
  - it will error for other backends as there is no sensible default URL
- if you do set the **correct** path at the end of the URL it will not add it a second time as it checks if it is already present
- there is an option to disable this behavior: `llm.disableUrlPathCompletion`

### Suggestion behavior

You can tune the way the suggestions behave:
- `llm.enableAutoSuggest` lets you choose to enable or disable "suggest-as-you-type" suggestions.
- `llm.documentFilter` lets you enable suggestions only on specific files that match the pattern matching syntax you will provide. The object must be of type [`DocumentFilter | DocumentFilter[]`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#documentFilter):
  - to match on all types of buffers: `llm.documentFilter: { pattern: "**" }`
  - to match on all files in `my_project/`: `llm.documentFilter: { pattern: "/path/to/my_project/**" }`
  - to match on all python and rust files: `llm.documentFilter: { pattern: "**/*.{py,rs}" }`

### Keybindings

**llm-vscode** sets two keybindings:
* you can trigger suggestions with `Cmd+shift+l` by default, which corresponds to the `editor.action.inlineSuggest.trigger` command
* [code attribution](#code-attribution) is set to `Cmd+shift+a` by default, which corresponds to the `llm.attribution` command

### [**llm-ls**](https://github.com/huggingface/llm-ls)

By default, **llm-ls** is bundled with the extension. When developing locally or if you built your own binary because your platform is not supported, you can set the `llm.lsp.binaryPath` setting to the path of the binary.

### Tokenizer

**llm-ls** uses [**tokenizers**](https://github.com/huggingface/tokenizers) to make sure the prompt fits the `context_window`.

To configure it, you have a few options:
* No tokenization, **llm-ls** will count the number of characters instead:
```json
{
  "llm.tokenizer": null
}
```
* from a local file on your disk:
```json
{
  "llm.tokenizer": {
    "path": "/path/to/my/tokenizer.json"
  }
}
```
* from a Hugging Face repository, **llm-ls** will attempt to download `tokenizer.json` at the root of the repository:
```json
{
  "llm.tokenizer": {
    "repository": "myusername/myrepo",
    "api_token": null,
  }
}
```
Note: when `api_token` is set to null, it will use the token you set with `Llm: Login` command. If you want to use a different token, you can set it here.

* from an HTTP endpoint, **llm-ls** will attempt to download a file via an HTTP GET request:
```json
{
  "llm.tokenizer": {
    "url": "https://my-endpoint.example.com/mytokenizer.json",
    "to": "/download/path/of/mytokenizer.json"
  }
}
```

### Code Llama

To test Code Llama 13B model:
1. Make sure you have the [latest version of this extension](#installing).
2. Make sure you have [supplied HF API token](#hf-api-token)
3. Open Vscode Settings (`cmd+,`) & type: `Llm: Config Template`
4. From the dropdown menu, choose `hf/codellama/CodeLlama-13b-hf`

Read more [here](https://huggingface.co/blog/codellama) about Code LLama.

### Phind and WizardCoder

To test [Phind/Phind-CodeLlama-34B-v2](https://hf.co/Phind/Phind-CodeLlama-34B-v2) and/or [WizardLM/WizardCoder-Python-34B-V1.0](https://hf.co/WizardLM/WizardCoder-Python-34B-V1.0) :
1. Make sure you have the [latest version of this extension](#installing).
2. Make sure you have [supplied HF API token](#hf-api-token)
3. Open Vscode Settings (`cmd+,`) & type: `Llm: Config Template`
4. From the dropdown menu, choose `hf/Phind/Phind-CodeLlama-34B-v2` or `hf/WizardLM/WizardCoder-Python-34B-V1.0`

Read more about Phind-CodeLlama-34B-v2 [here](https://huggingface.co/Phind/Phind-CodeLlama-34B-v2) and WizardCoder-15B-V1.0 [here](https://huggingface.co/WizardLM/WizardCoder-15B-V1.0).

## Developing

1. Clone `llm-ls`: `git clone https://github.com/huggingface/llm-ls`
2. Build `llm-ls`: `cd llm-ls && cargo build` (you can also use `cargo build --release` for a release build)
3. Clone this repo: `git clone https://github.com/huggingface/llm-vscode`
4. Install deps: `cd llm-vscode && npm ci`
5. In vscode, open `Run and Debug` side bar & click `Launch Extension`
6. In the new vscode window, set the `llm.lsp.binaryPath` setting to the path of the `llm-ls` binary you built in step 2 (e.g. `/path/to/llm-ls/target/debug/llm-ls`)
7. Close the window and restart the extension with `F5` or like in `5.`

## Community

| Repository | Description |
| --- | --- |
| [huggingface-vscode-endpoint-server](https://github.com/LucienShui/huggingface-vscode-endpoint-server) | Custom code generation endpoint for this repository |
| [llm-vscode-inference-server](https://github.com/wangcx18/llm-vscode-inference-server) | An endpoint server for efficiently serving quantized open-source LLMs for code. |
