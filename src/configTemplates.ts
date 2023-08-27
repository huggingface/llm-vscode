const templateKeys = ["bigcode/starcoder", "codellama/CodeLlama-13b-hf", "Custom"] as const;
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

export const templates: Partial<Record<TemplateKey, Config>> = {
  "bigcode/starcoder": StarCoderConfig,
  "codellama/CodeLlama-13b-hf": CodeLlama13BConfig,
}
