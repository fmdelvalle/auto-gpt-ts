import { IChatMessage, ICommandContext } from 'types';
import { llm_create_chat_completion } from '../llm/llm_utils';
import { count_message_tokens, get_encoding_data_for_model } from '../llm/token_counter';
import { TiktokenEncoding, TiktokenModel } from '@dqbd/tiktoken';
import { createSentencizer } from './sentencizer';

/**
 * This function:
 * - gets all text from a web page
 * - splits it into chunks of a given length made of contiguous sentences that don't exceed the length limit
 * - for each chunk, it creates a summary, related to the question
 * - it joins all summaries into a single one
 * - it runs the question again on the joined summary
 * - it returns the final summary
 */
export async function summarize_text(
    ctx: ICommandContext,
  url: string,
  text: string,
  question: string
): Promise<string> {
  if (!text) {
    return "Error: No text to summarize";
  }

  const model = ctx.llm.models.fast_llm_model;
  const {logger} = ctx.agent;

  let summaries: string[] = [];
  for await( const chunk of split_text(text, ctx.browser.browse_chunk_max_length, model, ctx.llm.embeddings.tokenizer, question) ) {
    const chunks = [chunk];
    const scrollRatio = 1 / chunks.length;

    for (let i = 0; i < chunks.length; i++) {
        //TODO
        /*
      if (driver) {
        scroll_to_percentage(driver, scrollRatio * i);
      }*/
      logger.info(`Adding chunk source to memory`);
  
      const memoryToAdd = `Source: ${url}\nRaw content part#${i + 1}: ${chunks[i]}`;
  
      const memory = ctx.agent.memory;
      await memory.add(memoryToAdd);
  
      const messages = [create_message(chunks[i], question)];
      const tokensForChunk = count_message_tokens(messages, model);
      logger.info(
        `Summarizing chunk ${i + 1} / ${chunks.length} of length ${
          chunks[i].length
        } characters, or ${tokensForChunk} tokens`
      );
  
      const summary = await llm_create_chat_completion(ctx.agent, messages, model);
      summaries.push(summary);
      logger.info(
        `Adding chunk summary to memory: ` + summary
      );
  
      const memoryToAdd2 = `Source: ${url}\nContent summary part#${i + 1}: ${summary}`;
  
      await memory.add(memoryToAdd2);
    }
  
//    logger.info(`Summarized ${chunks.length} chunks. ` );
  }
  logger.info("Summarized all chunks, combining them and running the question again.");
  const combinedSummary = summaries.join('\n');
  const messages = [create_message(combinedSummary, question)];

  return llm_create_chat_completion(ctx.agent, messages, model);
}

/**
 * Based in the original function, but it is very inefficient and slow because it keeps parsing the same sentences over and over.
 */
export function* split_text_deprecated(
    text: string,
    max_length: number = 2000,
    model: TiktokenModel,
    encoding: TiktokenEncoding,
    question: string = ""
  ) {
    const flattenedParagraphs = text.split('\n').join(' ');
    const doc = createSentencizer('sentencizer');
    const ret = doc(encoding, flattenedParagraphs);
    console.log("Got sentences: ", ret.sents.length);

    let currentChunk : string[] = [];
  
    // Schlemiel the Painter's algorithm
    let loop_count = 0;
    for (const sent of ret.sents) {
      const sentence = sent.text.trim();
      loop_count++;

      const messageWithAdditionalSentence = [
        create_message(currentChunk.join(' ') + ' ' + sentence, question)
      ];
  
      const expectedTokenUsage =
        count_message_tokens(messageWithAdditionalSentence, model) + 1;
      console.log("Loop count: ", loop_count, " Sentence tokens: ", sent.tokens, "Expected: ", expectedTokenUsage,  " Current HH:ss: ", new Date().toLocaleTimeString() );

      if (expectedTokenUsage <= max_length) {
        currentChunk.push(sentence);
      } else {
        console.log("Yielding chunk: ", loop_count );
        yield currentChunk.join(' ');
        currentChunk = [sentence];
        const messageThisSentenceOnly = [
            create_message(currentChunk.join(' '), question)
        ];
        const expectedTokenUsage = count_message_tokens(messageThisSentenceOnly, model) + 1;
        if (expectedTokenUsage > max_length) {
          throw new Error(
            `Sentence is too long in webpage: ${expectedTokenUsage} tokens.`
          );
        }
      }
    }
  
    if (currentChunk.length) {
      console.log("Yielding last chunk ", loop_count );
      yield currentChunk.join(' ');
    }
  }
  
  export function* split_text(
    text: string,
    max_length: number = 2000,
    model: TiktokenModel,
    encoding: TiktokenEncoding,
    question: string = ""
  ) {
    const flattenedParagraphs = text.split('\n').join(' ');
    const doc = createSentencizer('sentencizer');
    const ret = doc(encoding, flattenedParagraphs);
//    console.log("Got sentences: ", ret.sents.length);

    const params = get_encoding_data_for_model(model);

    let currentChunk : string[] = [];
  
    let loop_count = 0;
    let base_message_token_count = count_message_tokens([create_message("Hi", question)], model) - 1;
//    console.log("Base message token count: ", base_message_token_count);
    let current_token_count = base_message_token_count;
    for (const sent of ret.sents) {
      const sentence = sent.text.trim();
      // Warning: it seems that if a message has 'name' attr we have to add params.tokensPerName
      const expectedTokenUsage = current_token_count + sent.tokens;
      loop_count++;
//      console.log("Loop count: ", loop_count, " Sentence tokens: ", sent.tokens, "Expected: ", expectedTokenUsage,  " Current HH:ss: ", new Date().toLocaleTimeString() );
      if (expectedTokenUsage <= max_length) {
        currentChunk.push(sentence);
        current_token_count = expectedTokenUsage;
      } else {
//        console.log("Yielding chunk: ", loop_count );
        yield currentChunk.join(' ');
        currentChunk = [sentence];
        current_token_count = base_message_token_count;
        if( sent.tokens > max_length ){
            throw new Error(
                `Sentence is too long in webpage: ${sent.tokens} tokens.`
              );
        }
      }
    }
  
    if (currentChunk.length) {
//      console.log("Yielding last chunk ", loop_count );
      yield currentChunk.join(' ');
    }
  }
  

function create_message(chunk: string, question: string): IChatMessage {
    return {
      role: "user",
      content: `"""${chunk}""" Using the above text, answer the following question: "${question}" -- if the question cannot be answered using the text, summarize the text.`,
    };
  }

// Given some text, we need to split it in words, and if there are too many words, returning only the first ones with '...' at the end.
// If it fits, we return it as is.
export function truncate_text(text: string, max_length: number = 10) {
    const words = text.split(' ');
    if( words.length > max_length ){
        return words.slice(0, max_length).join(' ') + '...';
    }
    return text;
}

