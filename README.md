# LLM powered development for VSCode

**llm-vscode** is an extension for all things LLM. It uses [**llm-ls**](https://github.com/huggingface/llm-ls) as its backend.

We also have extensions for:
* [neovim](https://github.com/huggingface/llm.nvim)
* [jupyter](https://github.com/bigcode-project/jupytercoder)

The currently supported models are:

* [StarCoder](https://huggingface.co/blog/starcoder) from the [BigCode](https://www.bigcode-project.org/) project. Find more info [here](https://huggingface.co/blog/starcoder).
* [Code Llama](http://hf.co/codellama) from Meta. Find more info [here](http://hf.co/blog/codellama).

To see a more complete list of supported models, you can check the config template.

Previously **huggingface-vscode**.

## Installing

Install like any other [vscode extension](https://marketplace.visualstudio.com/items?itemName=HuggingFace.huggingface-vscode).

By default, this extension uses [bigcode/starcoder](https://huggingface.co/bigcode/starcoder) & [Hugging Face Inference API](https://huggingface.co/inference-api) for the inference. However, you can [configure](#configuring) the extension to query a custom endpoint provided it adheres to the API defined [here](https://huggingface.co/docs/api-inference/detailed_parameters#text-generation-task) or [here](https://huggingface.github.io/text-generation-inference/#/Text%20Generation%20Inference/generate).

#### HF API token

You can supply your HF API token ([hf.co/settings/token](https://hf.co/settings/token)) with this command:
1. `Cmd/Ctrl+Shift+P` to open VSCode command palette
2. Type: `LLM: Login`

<img src="https://github.com/huggingface/huggingface-vscode/raw/master/assets/set-api-token.png" width="800px">

## Testing

1. Create a new python file
2. Try typing `def main():`

<img src="https://github.com/huggingface/huggingface-vscode/raw/master/assets/ext-working.png" width="800px">

#### Checking if the generated code is in [The Stack](https://huggingface.co/datasets/bigcode/the-stack)

Hit `Cmd+shift+a` to check if the generated code is in in [The Stack](https://huggingface.co/datasets/bigcode/the-stack).
This is a rapid first-pass attribution check using [stack.dataportraits.org](https://stack.dataportraits.org).
We check for sequences of at least 50 characters that match a Bloom filter.
This means false positives are possible and long enough surrounding context is necesssary (see the [paper](https://dataportraits.org/) for details on n-gram striding and sequence length).
[The dedicated Stack search tool](https://hf.co/spaces/bigcode/search) is a full dataset index and can be used for a complete second pass. 


## Checking output

You can see input to & output from the code generation API:

1. Open VSCode `OUTPUT` panel
2. Choose `LLM VS Code`

<img src="https://github.com/huggingface/huggingface-vscode/raw/master/assets/ext-output.png" width="800px">

## Configuring

You can configure: endpoint to where request will be sent and special tokens.

<img src="https://github.com/huggingface/huggingface-vscode/raw/master/assets/set-configs.png" width="800px">

Example:

Let's say your current code is this:
```py
import numpy as np
import scipy as sp
{YOUR_CURSOR_POSITION}
def hello_world():
    print("Hello world")
```

Then, the request body will look like:
```js
const inputs = `{start token}import numpy as np\nimport scipy as sp\n{end token}def hello_world():\n    print("Hello world"){middle token}`
const data = {inputs, parameters:{max_new_tokens:256}};  // {"inputs": "", "parameters": {"max_new_tokens": 256}}

const res = await fetch(endpoint, {
    body: JSON.stringify(data),
    headers,
    method: "POST"
});

const json = await res.json() as any as {generated_text: string};  // {"generated_text": ""}
```

## Code Llama

To test Code Llama 13B model:
1. Make sure you have the [latest version of this extesion](#installing).
2. Make sure you have [supplied HF API token](#hf-api-token)
3. Open Vscode Settings (`cmd+,`) & type: `LLM: Config Template`
4. From the dropdown menu, choose `codellama/CodeLlama-13b-hf`

<img src="https://github.com/huggingface/huggingface-vscode/raw/master/assets/set-code-llama.png" width="600px">

Read more [here](https://huggingface.co/blog/codellama) about Code LLama.

## Phind and WizardCoder

To test [Phind/Phind-CodeLlama-34B-v2](hf.co/Phind/Phind-CodeLlama-34B-v2) and/or [WizardLM/WizardCoder-Python-34B-V1.0](hf.co/WizardLM/WizardCoder-Python-34B-V1.0) :
1. Make sure you have the [latest version of this extesion](#installing).
2. Make sure you have [supplied HF API token](#hf-api-token)
3. Open Vscode Settings (`cmd+,`) & type: `Hugging Face Code: Config Template`
4. From the dropdown menu, choose `Phind/Phind-CodeLlama-34B-v2` or `WizardLM/WizardCoder-Python-34B-V1.0`

<img src="https://github.com/huggingface/huggingface-vscode/raw/master/assets/set-phind-wizardcoder.png" width="600px">

Read more about Phind-CodeLlama-34B-v2 [here](https://huggingface.co/Phind/Phind-CodeLlama-34B-v2) and WizardCoder-15B-V1.0 [here](https://huggingface.co/WizardLM/WizardCoder-15B-V1.0).

## Developing

1. Clone this repo: `git clone https://github.com/huggingface/llm-vscode`
2. Install deps: `cd huggingface-vscode && npm i`
3. In vscode, open `Run and Debug` side bar & click `Launch Extension`

## Community

| Repository | Description |
| --- | --- |
| [huggingface-vscode-endpoint-server](https://github.com/LucienShui/huggingface-vscode-endpoint-server) | Custom code generation endpoint for this repository |