const templateKeys = ["bigcode/starcoder", "codellama/CodeLlama-13b-hf", "Phind/Phind-CodeLlama-34B-v2", "WizardLM/WizardCoder-Python-34B-V1.0", "ollama/CodeLlama-7b-code", "openai/chat-gpt-3.5-turbo", "Custom"] as const;
export type TemplateKey = typeof templateKeys[number];

export interface TokenizerPathConfig {
    path: string;
}

export interface TokenizerRepoConfig {
    repository: string;
}

export interface TokenizerUrlConfig {
    url: string;
    to: string;
}

export interface Config {
    modelIdOrEndpoint: string;
    "fillInTheMiddle.enabled": boolean;
    "fillInTheMiddle.prefix": string;
    "fillInTheMiddle.middle": string;
    "fillInTheMiddle.suffix": string;
    temperature: number;
    contextWindow: number;
    tokensToClear: string[];
    tokenizer: TokenizerPathConfig | TokenizerRepoConfig | TokenizerUrlConfig | null;
    adaptor?: string;
    requestBody?: object & { model?: string };
}

const StarCoderConfig: Config = {
    modelIdOrEndpoint: "bigcode/starcoder",
    "fillInTheMiddle.enabled": true,
    "fillInTheMiddle.prefix": "<fim_prefix>",
    "fillInTheMiddle.middle": "<fim_middle>",
    "fillInTheMiddle.suffix": "<fim_suffix>",
    temperature: 0.2,
    contextWindow: 8192,
    tokensToClear: ["<|endoftext|>"],
    tokenizer: {
        repository: "bigcode/starcoder",
    }
}

const CodeLlama13BConfig: Config = {
    modelIdOrEndpoint: "codellama/CodeLlama-13b-hf",
    "fillInTheMiddle.enabled": true,
    "fillInTheMiddle.prefix": "<PRE> ",
    "fillInTheMiddle.middle": " <MID>",
    "fillInTheMiddle.suffix": " <SUF>",
    temperature: 0.2,
    contextWindow: 4096,
    tokensToClear: ["<EOT>"],
    tokenizer: {
        repository: "codellama/CodeLlama-13b-hf",
    }
}

const PhindCodeLlama34Bv2Config: Config = {
    ...CodeLlama13BConfig,
    modelIdOrEndpoint: "Phind/Phind-CodeLlama-34B-v2",
}

const WizardCoderPython34Bv1Config: Config = {
    ...CodeLlama13BConfig,
    modelIdOrEndpoint: "WizardLM/WizardCoder-Python-34B-V1.0",
    tokenizer: {
        repository: "WizardLM/WizardCoder-Python-34B-V1.0",
    }
}

const OllamaAdaptorDefaultConfig: Config = {
    modelIdOrEndpoint: "http://localhost:11435/api/generate",
    "fillInTheMiddle.enabled": true,
    "fillInTheMiddle.prefix": "<PRE>",
    "fillInTheMiddle.middle": "<MID>",
    "fillInTheMiddle.suffix": "<SUF>",
    temperature: 0.2,
    contextWindow: 8192,
    tokensToClear: ["<EOT>"],
    tokenizer: {
        repository: "codellama/CodeLlama-7b-hf",
    },
    adaptor: "ollama",
    requestBody: { model: "codellama:7b-code" }
}

const OpenAIAdaptorDefaultConfig: Config = {
    modelIdOrEndpoint: "https://api.openai.com/v1/chat/completions",
    "fillInTheMiddle.enabled": true,
    "fillInTheMiddle.prefix": "<im_start>",
    "fillInTheMiddle.middle": "<im_end>",
    "fillInTheMiddle.suffix": "<im_end>",
    temperature: 0.2,
    contextWindow: 8192,
    tokensToClear: ["<endoftext>"],
    tokenizer: null,
    adaptor: "openai",
    requestBody: { model: "gpt-3.5-turbo" }
}

export const templates: Partial<Record<TemplateKey, Config>> = {
    "bigcode/starcoder": StarCoderConfig,
    "codellama/CodeLlama-13b-hf": CodeLlama13BConfig,
    "Phind/Phind-CodeLlama-34B-v2": PhindCodeLlama34Bv2Config,
    "WizardLM/WizardCoder-Python-34B-V1.0": WizardCoderPython34Bv1Config,
    "ollama/CodeLlama-7b-code": OllamaAdaptorDefaultConfig,
    "openai/chat-gpt-3.5-turbo": OpenAIAdaptorDefaultConfig,
}
