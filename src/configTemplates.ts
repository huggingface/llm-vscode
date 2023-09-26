const templateKeys = ["bigcode/starcoder", "codellama/CodeLlama-13b-hf", "Phind/Phind-CodeLlama-34B-v2", "WizardLM/WizardCoder-Python-34B-V1.0", "Custom"] as const;
export type TemplateKey = typeof templateKeys[number];

export interface Config {
  modelIdOrEndpoint: string;
  isFillMode: boolean;
  autoregressiveModeTemplate: string;
  fillModeTemplate: string;
  temperature: number;
  stopTokens: string[];
  tokensToClear: string[];
}

export const PREFIX = `[prefix]`;
export const SUFFIX = `[suffix]`;

const StarCoderConfig: Config = {
  modelIdOrEndpoint: "bigcode/starcoder",
  isFillMode: true,
  autoregressiveModeTemplate: PREFIX,
  fillModeTemplate: `<fim_prefix>${PREFIX}<fim_suffix>${SUFFIX}<fim_middle>`,
  temperature: 0.2,
  stopTokens: ["<|endoftext|>"],
  tokensToClear: ["<fim_middle>"],
}

const CodeLlama13BConfig: Config = {
  modelIdOrEndpoint: "codellama/CodeLlama-13b-hf",
  isFillMode: true,
  autoregressiveModeTemplate: PREFIX,
  fillModeTemplate: `<PRE> ${PREFIX} <SUF>${SUFFIX} <MID>`,
  temperature: 0.2,
  stopTokens: ["<|endoftext|>", "<EOT>"],
  tokensToClear: [ "<MID>"],
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
