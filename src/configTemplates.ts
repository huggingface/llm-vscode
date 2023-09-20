const templateKeys = ["bigcode/starcoder", "codellama/CodeLlama-13b-hf", "Phind/Phind-CodeLlama-34B-v2", "WizardLM/WizardCoder-Python-34B-V1.0", "Custom"] as const;
export type TemplateKey = typeof templateKeys[number];

export interface Config {
    modelIdOrEndpoint: string;
    "fillInTheMiddle.enabled": boolean;
    "fillInTheMiddle.prefix": string;
    "fillInTheMiddle.middle": string;
    "fillInTheMiddle.suffix": string;
    temperature: number;
    contextWindow: number;
    tokensToClear: string[];
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
}

const PhindCodeLlama34Bv2Config: Config = {
    ...CodeLlama13BConfig,
    modelIdOrEndpoint: "Phind/Phind-CodeLlama-34B-v2",
}

const WizardCoderPython34Bv1Config: Config = {
    ...CodeLlama13BConfig,
    modelIdOrEndpoint: "WizardLM/WizardCoder-Python-34B-V1.0",
}

export const templates: Partial<Record<TemplateKey, Config>> = {
    "bigcode/starcoder": StarCoderConfig,
    "codellama/CodeLlama-13b-hf": CodeLlama13BConfig,
    "Phind/Phind-CodeLlama-34B-v2": PhindCodeLlama34Bv2Config,
    "WizardLM/WizardCoder-Python-34B-V1.0": WizardCoderPython34Bv1Config,
}