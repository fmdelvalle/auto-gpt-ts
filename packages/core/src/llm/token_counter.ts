import * as tiktoken from '@dqbd/tiktoken';
import { IChatMessage } from '../types';

export function get_encoding_data_for_model( model: tiktoken.TiktokenModel ) {
  let tokensPerMessage = -1;
  let tokensPerName = -1;

  let final_model = model;

  if (model === "gpt-3.5-turbo") {
    final_model = "gpt-3.5-turbo-0301";
  } else if (model === "gpt-4") {
    final_model = "gpt-4-0314";
  } 
  if (final_model === "gpt-3.5-turbo-0301") {
    tokensPerMessage = 4; // every message follows {role/name}\n{content}\n
    tokensPerName = -1; // if there's a name, the role is omitted
  } else if (final_model === "gpt-4-0314") {
    tokensPerMessage = 3;
    tokensPerName = 1;
  } else {
    throw new Error(
      `num_tokens_from_messages() is not implemented for model ${final_model}.\n` +
        "See https://github.com/openai/openai-python/blob/main/chatml.md for" +
        "information on how messages are converted to tokens."
    );
  }

  let encoding: any = null;
    try {
      encoding = tiktoken.encoding_for_model(model);
    } catch (error) {
      console.warn("Warning: model not found. Using cl100k_base encoding.");
      encoding = tiktoken.get_encoding("cl100k_base");
    }
    return {
      final_model,
      encoding,
      tokensPerMessage,
      tokensPerName
    }
}

export function count_message_tokens(
  messages: IChatMessage[],
  model: tiktoken.TiktokenModel = "gpt-3.5-turbo-0301"
): number {
  const params = get_encoding_data_for_model(model);
  const {tokensPerMessage, tokensPerName, encoding, final_model} = params;

  let numTokens = 0;

  for (const message of messages) {
    numTokens += tokensPerMessage;
    for (const [key, value] of Object.entries(message)) {
      numTokens += encoding.encode(value).length;
      if (key === "name") {
        numTokens += tokensPerName;
      }
    }
  }

  numTokens += 3; // every reply is primed with assistant

  return numTokens;
}


export function count_string_tokens(string: string, modelName: tiktoken.TiktokenModel): number {
  const encoding = tiktoken.encoding_for_model(modelName);
  return encoding.encode(string).length;
}
