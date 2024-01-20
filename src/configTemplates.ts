const templateKeys = ["hf/bigcode/starcoder", "hf/codellama/CodeLlama-13b-hf", "hf/Phind/Phind-CodeLlama-34B-v2", "hf/WizardLM/WizardCoder-Python-34B-V1.0", "ollama/codellama:7b", "hf/deepseek-ai/deepseek-coder-6.7b-base", "Custom"] as const;
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
	modelId: string;
	backend: "huggingface" | "ollama" | "openai" | "tgi";
	url: string | null;
	"fillInTheMiddle.enabled": boolean;
	"fillInTheMiddle.prefix": string;
	"fillInTheMiddle.middle": string;
	"fillInTheMiddle.suffix": string;
	requestBody: object;
	contextWindow: number;
	tokensToClear: string[];
	tokenizer: TokenizerPathConfig | TokenizerRepoConfig | TokenizerUrlConfig | null;
}

const HfStarCoderConfig: Config = {
	modelId: "bigcode/starcoder",
	backend: "huggingface",
	url: null,
	"fillInTheMiddle.enabled": true,
	"fillInTheMiddle.prefix": "<fim_prefix>",
	"fillInTheMiddle.middle": "<fim_middle>",
	"fillInTheMiddle.suffix": "<fim_suffix>",
	requestBody: {
		parameters: {
			max_new_tokens: 60,
			temperature: 0.2,
			top_p: 0.95
		}
	},
	contextWindow: 8192,
	tokensToClear: ["<|endoftext|>"],
	tokenizer: {
		repository: "bigcode/starcoder",
	}
}

const HfCodeLlama13BConfig: Config = {
	modelId: "codellama/CodeLlama-13b-hf",
	backend: "huggingface",
	url: null,
	"fillInTheMiddle.enabled": true,
	"fillInTheMiddle.prefix": "<PRE> ",
	"fillInTheMiddle.middle": " <MID>",
	"fillInTheMiddle.suffix": " <SUF>",
	requestBody: {
		parameters: {
			max_new_tokens: 60,
			temperature: 0.2,
			top_p: 0.95
		}
	},
	contextWindow: 4096,
	tokensToClear: ["<EOT>"],
	tokenizer: {
		repository: "codellama/CodeLlama-13b-hf",
	}
}

const HfDeepSeekConfig: Config = {
	modelId: "deepseek-ai/deepseek-coder-6.7b-base",
	backend: "huggingface",
	url: null,
	"fillInTheMiddle.enabled": true,
	"fillInTheMiddle.prefix": "<｜fim▁begin｜>",
	// DeepSeek names the suffix token fim_hole, 
	// as it indicates the position to fill in
	"fillInTheMiddle.suffix": "<｜fim▁hole｜>",
	"fillInTheMiddle.middle": "<｜fim▁end｜>",
	// DeepSeek should support 16k, 
	// keeping at 8k because of resource constraints
	contextWindow: 8192,
	tokensToClear: ["<|EOT|>"],
	tokenizer: {
		repository: "deepseek-ai/deepseek-coder-6.7b-base",
	},
	requestBody: {
		parameters: {
			max_new_tokens: 128,
			temperature: 0.1,
			top_p: 0.95
		}
	}
}

const HfPhindCodeLlama34Bv2Config: Config = {
    ...HfCodeLlama13BConfig,
    modelId: "Phind/Phind-CodeLlama-34B-v2",
}

const HfWizardCoderPython34Bv1Config: Config = {
	...HfCodeLlama13BConfig,
    modelId: "WizardLM/WizardCoder-Python-34B-V1.0",
    tokenizer: {
    	repository: "WizardLM/WizardCoder-Python-34B-V1.0",
    }
}

const OllamaCodeLlama7BConfig: Config = {
	...HfCodeLlama13BConfig,
	modelId: "codellama:7b",
	backend: "ollama",
	url: "http://localhost:11434/api/generate",
	requestBody: {
		options: {
			num_predict: 60,
			temperature: 0.2,
			top_p: 0.95
		}
	},
	contextWindow: 2048,
	tokenizer: {
		repository: "codellama/CodeLlama-7b-hf",
	}
}

export const templates: Partial<Record<TemplateKey, Config>> = {
	"hf/bigcode/starcoder": HfStarCoderConfig,
	"hf/codellama/CodeLlama-13b-hf": HfCodeLlama13BConfig,
	"hf/Phind/Phind-CodeLlama-34B-v2": HfPhindCodeLlama34Bv2Config,
	"hf/WizardLM/WizardCoder-Python-34B-V1.0": HfWizardCoderPython34Bv1Config,
    "hf/deepseek-ai/deepseek-coder-6.7b-base": HfDeepSeekConfig,
	"ollama/codellama:7b": OllamaCodeLlama7BConfig,
}
