/** It takes care of tracking costs */

import { OpenAIApi } from "openai";
import { IChatMessage, ILogger } from "../types";
import { COSTS, IOpenAIModel } from "./models_info";

export function prepareOpenAI(api_key: string) {
  return new OpenAIApi({
    apiKey: api_key,
    isJsonMime: (mime: string) => mime.includes('application/json'),
    baseOptions: {
      headers: {
        'Authorization': 'Bearer ' + api_key,
      }
    }
  });

}

export type ICreateChatCompletionResponse = {
  choices: IChatMessage[]
} | null;


/**
 * This class is responsible for tracking costs
 */

export class ApiManager {
  private total_prompt_tokens: number;
  private total_completion_tokens: number;
  private total_cost: number;
  private total_budget: number;

  constructor() {
    this.total_prompt_tokens = 0;
    this.total_completion_tokens = 0;
    this.total_cost = 0;
    this.total_budget = 0;
  }

  reset(): void {
    this.total_prompt_tokens = 0;
    this.total_completion_tokens = 0;
    this.total_cost = 0;
    this.total_budget = 0;
  };

  updateCost(logger: ILogger, prompt_tokens: number, completion_tokens: number, model: IOpenAIModel): void {
    this.total_prompt_tokens += prompt_tokens;
    this.total_completion_tokens += completion_tokens;
    this.total_cost +=
      (prompt_tokens * COSTS[model]['prompt'] +
        completion_tokens * COSTS[model]['completion']) / 1000;
    logger.debug(`Total running cost: $${this.total_cost.toFixed(3)}`);
  }

  setTotalBudget(total_budget: number): void {
    this.total_budget = total_budget;
  }

  getTotalPromptTokens(): number {
    return this.total_prompt_tokens;
  }

  getTotalCompletionTokens(): number {
    return this.total_completion_tokens;
  }

  getTotalCost(): number {
    return this.total_cost;
  }

  getTotalBudget(): number {
    return this.total_budget;
  }
}
