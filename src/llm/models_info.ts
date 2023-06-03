export type IOpenAIModel = 'gpt-3.5-turbo'|'gpt-3.5-turbo-0301'|'gpt-4-0314'|'gpt-4'|'gpt-4-32k'|'gpt-4-32k-0314'|'text-embedding-ada-002';

export const COSTS : Record<IOpenAIModel, { prompt: number, completion: number}> = {
    "gpt-3.5-turbo": { "prompt": 0.002, "completion": 0.002 },
    "gpt-3.5-turbo-0301": { "prompt": 0.002, "completion": 0.002 },
    "gpt-4-0314": { "prompt": 0.03, "completion": 0.06 },
    "gpt-4": { "prompt": 0.03, "completion": 0.06 },
    "gpt-4-32k": { "prompt": 0.06, "completion": 0.12 },
    "gpt-4-32k-0314": { "prompt": 0.06, "completion": 0.12 },
    "text-embedding-ada-002": { "prompt": 0.0004, "completion": 0.0 },
}
