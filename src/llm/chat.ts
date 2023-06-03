import { CURRENT_CONTEXT_FILE_NAME } from "../loggers/cycle_logger";
import { RateLimitError } from "../errors/errors";
import { get_newly_trimmed_messages, update_running_summary } from "../memory/management/summary_memory";
import { IAgent, IChatMessage, IMessageRole } from "../types";
import { llm_create_chat_completion } from "./llm_utils";
import { count_message_tokens } from "./token_counter";


/**
 * Create a chat message with the given role and content.
 *
 * @param role - The role of the message sender, e.g., "system", "user", or "assistant".
 * @param content - The content of the message.
 * @returns A message object containing the role and content.
 */
function create_chat_message(role: IMessageRole, content: string): IChatMessage {
  return { role, content };
}

/**
 * Generate the context for the chat interaction.
 *
 * @param prompt - The prompt explaining the rules to the AI.
 * @param relevant_memory - The relevant memory for the AI.
 * @param full_message_history - The list of all messages sent between the user and the AI.
 * @param model - The model to use for tokenization.
 * @returns An array containing the next message index, current tokens used, insertion index, and current context.
 */
function generate_context(
  prompt: string,
  relevant_memory: string,
  full_message_history: IChatMessage[],
  model: any
): [number, number, number, IChatMessage[]] {
  const current_context: IChatMessage[] = [
    create_chat_message("system", prompt),
    create_chat_message(
      "system",
      `The current time and date is ${new Date().toLocaleString()}`
    ),
    // create_chat_message(
    //     "system",
    //     `This reminds you of these events from your past:\n${relevant_memory}\n\n`
    // ),
  ];

  let next_message_to_add_index = full_message_history.length - 1;
  const insertion_index = current_context.length;
  let current_tokens_used = count_message_tokens(current_context, model);

  return [
    next_message_to_add_index,
    current_tokens_used,
    insertion_index,
    current_context,
  ];
}

/**
 * Called from agent.ts when "thinking" (that is, asking the AI for a plan)
 * @param agent 
 * @param prompt 
 * @param userInput 
 * @param fullMessageHistory 
 * @param tokenLimit 
 * @returns 
 */
export async function chat_with_ai(
  agent: IAgent,
  prompt: string,
  userInput: string,
  fullMessageHistory: IChatMessage[],
  tokenLimit: number
): Promise<string> {

    const {config: cfg, logger, api_manager} = agent;
  while (true) {
    try {
      const model = cfg.llm.models.fast_llm_model; // TODO: Change model from hardcode to argument
      // Reserve 1000 tokens for the response
      const sendTokenLimit = tokenLimit - 1000;

      let relevantMemory = "";

      let [nextMessageToAddIndex, currentTokensUsed, insertionIndex, messages_to_send] =
        generate_context(
          prompt,
          relevantMemory,
          fullMessageHistory,
          model
        );

        const tokens_used = count_message_tokens(
            [create_chat_message("user", userInput)],
            model
          ); // Account for user input (appended later)
      currentTokensUsed += tokens_used;

      currentTokensUsed += 500; // Account for memory (appended later) TODO: The final memory may be less than 500 tokens

      // Add Messages until the token limit is reached or there are no more messages to add.
      while (nextMessageToAddIndex >= 0) {
        const messageToAdd = fullMessageHistory[nextMessageToAddIndex];

        const tokensToAdd = count_message_tokens([messageToAdd], model);
        if (currentTokensUsed + tokensToAdd > sendTokenLimit) {
          break;
        }

        messages_to_send.splice(
          insertionIndex,
          0,
          fullMessageHistory[nextMessageToAddIndex]
        );

        currentTokensUsed += tokensToAdd;

        nextMessageToAddIndex--;
      }

      const [ newlyTrimmedMessages ] = get_newly_trimmed_messages(
        fullMessageHistory,
        messages_to_send,
        agent.last_memory_index
      );

      console.log("chat_with_ai(): updating running summary");

      agent.summary_memory = await update_running_summary(
        agent,
        agent.summary_memory,
        newlyTrimmedMessages
      );
      messages_to_send.splice(insertionIndex, 0, agent.summary_memory);

      console.log("chat_with_ai(): final context", messages_to_send);

      if (api_manager.getTotalBudget() > 0.0) {
        const remainingBudget =
          api_manager.getTotalBudget() - api_manager.getTotalCost();
        const remainingBudgetFormatted = remainingBudget.toFixed(3);
        const systemMessage =
          `Your remaining API budget is $${remainingBudgetFormatted}` +
          (
            remainingBudget === 0
              ? " BUDGET EXCEEDED! SHUT DOWN!\n\n"
              : remainingBudget < 0.005
              ? " Budget very nearly exceeded! Shut down gracefully!\n\n"
              : remainingBudget < 0.01
              ? " Budget nearly exceeded. Finish up.\n\n"
              : "\n\n"
          );

        logger.debug(systemMessage);
        messages_to_send.push(create_chat_message("system", systemMessage));
      }

      messages_to_send.push(create_chat_message("user", userInput));

      if(!agent.config.prompt_generator) {
        throw new Error("Prompt generator not defined");
    }

      let queue_full = false;
      // Plugins can add messages to the end of the message list.
      for(const plugin of cfg.plugins) {
        if (!plugin.on_planning) {
          continue;
        }
        if( queue_full ) {
          logger.debug("Skipping plugin because queue is full:", plugin.classname);
          continue;
        }
        const pluginResponse = await plugin.on_planning(
          agent.config.prompt_generator,
          messages_to_send
        );
        if (!pluginResponse || pluginResponse === "") {
          continue;
        }
        const tokensToAdd = count_message_tokens(
          [create_chat_message("system", pluginResponse)],
          model
        );
        if (currentTokensUsed + tokensToAdd > sendTokenLimit) {
          logger.debug("Plugin response too long, skipping:", pluginResponse);
          queue_full = true;
        } else {
          messages_to_send.push(create_chat_message("system", pluginResponse));
        }
      }

      const tokensRemaining = tokenLimit - currentTokensUsed;
      logger.debug(`Token limit: ${tokenLimit}`);
      logger.debug(`Send Token Count: ${currentTokensUsed}`);
      logger.debug(`Tokens remaining for response: ${tokensRemaining}`);
      logger.debug("------------ CONTEXT SENT TO AI ---------------");
      for (const message of messages_to_send) {
        if (
          message.role === "system" &&
          message.content === prompt
        ) {
          continue;
        }
        logger.debug(`${message.role.toLocaleUpperCase()}: ${message.content}`);
        logger.debug("");
      }
      logger.debug("----------- END OF CONTEXT ----------------");
      logger.log_in_cycle_file(
        messages_to_send,
        CURRENT_CONTEXT_FILE_NAME
      );

      const assistantReply = await llm_create_chat_completion(
        agent,
        messages_to_send,
        model,
        undefined,
        tokensRemaining
      );

      fullMessageHistory.push(create_chat_message("user", userInput));
      fullMessageHistory.push(create_chat_message("assistant", assistantReply));

      return assistantReply;
    } catch (error) {
      if (error instanceof RateLimitError) {
        logger.warn("Error: API Rate Limit Reached. Waiting 10 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } else {
        throw error;
      }
    }
  }
}
