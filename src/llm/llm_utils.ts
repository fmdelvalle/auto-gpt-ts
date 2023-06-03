import { Tiktoken, TiktokenEncoding, get_encoding } from '@dqbd/tiktoken';
import { getAzureDeploymentIdForModel } from '../core/azure';
import { IAgent, IChatMessage } from '../types';
import { CreateChatCompletionResponse, CreateEmbeddingRequest } from 'openai';
import { Fore } from '../loggers/functions';
import { IOpenAIModel } from './models_info';
import { ICreateChatCompletionResponse, prepareOpenAI } from './api_manager';
import { AxiosError, AxiosResponse, isAxiosError } from 'axios';

type IOpenAIError = {
  message: string,
  type: string,
  param: string,
  code: string
}

export async function get_ada_embedding(agent: IAgent, text: string): Promise<number[]> {
  const cfg = agent.config;
  const model = cfg.llm.embeddings.model;
  if (!model) {
    throw new Error("No embedding model specified");
  }
  text = text.replace("\n", " ");

  let kwargs: { [key: string]: any };
  if (cfg.llm.provider.use_azure) {
    kwargs = { "engine": getAzureDeploymentIdForModel(cfg, model) };
  } else {
    kwargs = { "model": model };
  }

  const embedding = await createEmbedding(agent, text, kwargs);
  return embedding;
}

function* chunkedTokens(text: string, tokenizer_name: TiktokenEncoding, chunk_length: number): Generator<Uint32Array> {
  const tokenizer: Tiktoken = get_encoding(tokenizer_name);
  const tokens = tokenizer.encode(text);

  for (let i = 0; i < tokens.length; i += chunk_length) {
    yield tokens.slice(i, i + chunk_length);
  }
}

type IEmbedding = {
  imput: Uint32Array[],
  api_key: string,
}

async function createEmbedding(agent: IAgent, text: string, kwargs: any = {}): Promise<number[]> {
  const cfg = agent.config;
  const chunk_embeddings: number[][] = [];
  const chunk_lengths: number[] = [];

  const openai = prepareOpenAI(cfg.llm.provider.openai_api_key);

  for (const chunk of chunkedTokens(text, cfg.llm.embeddings.tokenizer, cfg.llm.embeddings.token_limit)) {
    const request: CreateEmbeddingRequest = {
      input: [...chunk],  // UInt32Array gets serialized as string[]
      model: cfg.llm.embeddings.model,
      //        api_key: cfg.llm.provider.openai_api_key,
      ...kwargs,
    }

    console.log("Creating embedding in openai with " + chunk.length + " tokens");
    const { api_manager, logger } = agent;
    try {
      const result = await openai.createEmbedding(request);

      api_manager.updateCost(logger, result.data.usage.prompt_tokens, 0, cfg.llm.embeddings.model);

      chunk_embeddings.push(result.data.data[0].embedding);
      chunk_lengths.push(chunk.length);
    } catch (e) {
      if (isAxiosError(e)) {
        const axiosError = e as AxiosError;
        logger.error("Error creating embedding (Axios): " + axiosError.message);
      } else {
        logger.error("Error creating embedding: " + (e as Error).message);
      }
      throw (e);
    }
  }

  // Calculate weighted average
  const weights: number[] = chunk_lengths.map((length) => length / chunk_lengths.reduce((a, b) => a + b, 0));
  const chunk_embeddings_avg: number[] = [];

  for (let i = 0; i < chunk_embeddings[0].length; i++) {
    let sum = 0;

    for (let j = 0; j < chunk_embeddings.length; j++) {
      sum += chunk_embeddings[j][i] * weights[j];
    }

    chunk_embeddings_avg.push(sum);
  }

  // Normalize the length to one
  const norm = Math.sqrt(chunk_embeddings_avg.reduce((sum, val) => sum + val * val, 0));
  const chunk_embeddings_norm: number[] = chunk_embeddings_avg.map((val) => val / norm);

  return chunk_embeddings_norm;
}


/* Overly simple abstraction until we create something better
   simple retry mechanism when getting a rate error or a bad gateway.
    Args:
        messages (List[Message]): The messages to send to the chat completion
        model (str, optional): The model to use. Defaults to None.
        temperature (float, optional): The temperature to use. Defaults to 0.9.
        max_tokens (int, optional): The max tokens to use. Defaults to None.
   */
export async function llm_create_chat_completion(agent: IAgent, messages: IChatMessage[], model: IOpenAIModel, temperature?: number, max_tokens?: number)
  : Promise<string> {
  const numRetries = 10;
  let warnedUser = false;
  const { logger, api_manager } = agent;
  logger.debug(
    `llm_create_chat_completion(): using model ${model}, temperature ${temperature}, max_tokens ${max_tokens}`
  );

  // Plugins have an opportunity to handle the chat completion themselves
  for (const plugin of agent.config.plugins) {
    if( plugin.handle_chat_completion ) {
      const message = await plugin.handle_chat_completion({
        messages,
        model,
        temperature,
        max_tokens,
      });
      if (message !== false) {
        return message;
      }
    }
  }

  let response: ICreateChatCompletionResponse = null;

  for (let attempt = 0; attempt < numRetries; attempt++) {
    const backoff = 2 ** (attempt + 2);
    try {
      if (agent.config.llm.provider.use_azure) {
        response = await api_manager_create_chat_completion(
          agent,
          messages,
          model,
          temperature,
          max_tokens,
          getAzureDeploymentIdForModel(agent.config, model),
        );
      } else {
        response = await api_manager_create_chat_completion(
          agent,
          messages,
          model,
          temperature,
          max_tokens
        );
      }
      break;
    } catch (error) {
      if (isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 401) {
          console.log(axiosError.response?.headers);
          throw new Error("Invalid API key");
        } else if (axiosError.response?.status === 400) {
          const openaierror = axiosError.response?.data as { error?: IOpenAIError };
          if (openaierror && openaierror.error && openaierror.error.message) {
            console.log("HEADERS", axiosError.request.headers);
            throw new Error("Invalid request: " + openaierror.error.message);
          }
          throw new Error("Invalid request");
        } else if (axiosError.response?.status === 429) {
          logger.warn("Server too busy, retrying in " + backoff + " seconds");
          await new Promise((resolve) => setTimeout(resolve, backoff * 1000));
        } else {
          console.error(error);
          throw new Error("Axios error in llm_utils.ts");
        }
      } else {
        console.error("Unhandled, not Axios error", error);
        process.exit();
      }

      /*
      if (error instanceof RateLimitError) {
        console.debug('Error: Reached rate limit, passing...');
        if (!warnedUser) {
          console.debug(
            'Please double check that you have setup a PAID OpenAI API Account. ' +
              'You can read more here: https://docs.agpt.co/setup/#getting-an-api-key'
          );
          warnedUser = true;
        }
      } else if (error instanceof APIError || error instanceof Timeout) {
        if (error.httpStatus !== 502) {
          throw error;
        }
        if (attempt === numRetries - 1) {
          throw error;
        }
      }
            */

      console.debug(`Error: API Bad gateway. Waiting ${backoff} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, backoff * 1000));
    }
  }

  if (response === null) {
    logger.typewriter_log(
      'FAILED TO GET RESPONSE FROM OPENAI',
      Fore.RED,
      'Auto-GPT has failed to get a response from OpenAI\'s services. ' +
      'Try running Auto-GPT again, and if the problem persists try running it with `--debug`.'
    );
    logger.double_check();
    if (agent.config.has_debug) {
      throw new Error(`Failed to get response after ${numRetries} retries`);
    } else {
      process.exit(1);
    }
  }
  let responsetxt = response.choices[0].content;
  // Plugins have an opportunity to modify the response
  for (const plugin of agent.config.plugins) {
    if (plugin.on_response) {
      responsetxt = await plugin.on_response(responsetxt);
    }
  }
  return responsetxt;
}

async function api_manager_create_chat_completion(
  agent: IAgent,
  messages: IChatMessage[],
  model: IOpenAIModel,
  temperature?: number,
  max_tokens?: number,
  deployment_id?: any
): Promise<ICreateChatCompletionResponse> {
  const { logger, api_manager } = agent;

  if (temperature === null) {
    temperature = agent.config.llm.provider.temperature;
  }

  /**
   * OpenAI API client has a bug where it doesn't set the Authorization header, so API Key is never sent.
   */
  const openai = prepareOpenAI(agent.config.llm.provider.openai_api_key);

  let response: AxiosResponse<CreateChatCompletionResponse, any>;
  if (deployment_id !== null && deployment_id !== undefined) {
    throw new Error("deployment_id seems unsupported");
    /*
  response = await openai.createChatCompletion({
    deployment_id,
    model: model,
    messages: messages,
    temperature: temperature,
    max_tokens: max_tokens,
    api_key: cfg.llm.provider.openai_api_key
  });*/
  } else {
    console.log("llm_create_chat_completion(): requesting chat completion to OpenAI", model);
    response = await openai.createChatCompletion({
      model: model,
      messages,
      temperature,
      max_tokens
    }) as AxiosResponse<CreateChatCompletionResponse, any>;
    //      console.log("llm_create_chat_completion(): Received response"); // response.data?.choices[0]?.message);
  }

  if (!('error' in response)) {
    const prompt_tokens = response.data.usage?.prompt_tokens;
    const completion_tokens = response.data.usage?.completion_tokens;
    if (prompt_tokens === undefined || completion_tokens === undefined) {
      throw new Error("prompt_tokens or completion_tokens undefined");
    } else {
      api_manager.updateCost(logger, prompt_tokens, completion_tokens, model);
    }
  } else {
    logger.debug(`Error: ${response.error}`);
  }
  let ret: ICreateChatCompletionResponse = {
    choices: response.data.choices.filter((choice) => choice.message?.content !== undefined).map(c => c.message as IChatMessage)
  };
  return ret;
}
