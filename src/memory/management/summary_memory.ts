import { PROMPT_SUMMARY_FILE_NAME, SUMMARY_FILE_NAME } from '../../loggers/cycle_logger';
import { llm_create_chat_completion } from '../../llm/llm_utils';
import { IAgent, IChatMessage } from '../../types';


export function get_newly_trimmed_messages(
    full_message_history: IChatMessage[],
    current_context: IChatMessage[],
    last_memory_index: number
): [IChatMessage[], number] {
    /**
     * This function returns a list of dictionaries contained in full_message_history
     * with an index higher than prev_index that are absent from current_context.
     *
     * @param full_message_history - A list of dictionaries representing the full message history.
     * @param current_context - A list of dictionaries representing the current context.
     * @param last_memory_index - An integer representing the previous index.
     * @returns A list of dictionaries that are in full_message_history with an index higher than last_memory_index and absent from current_context.
     * @returns The new index value for use in the next loop.
     */
    const new_messages = full_message_history.filter((msg, i) => i > last_memory_index);

    const new_messages_not_in_context = new_messages.filter(msg => !current_context.includes(msg));

    let new_index = last_memory_index;
    if (new_messages_not_in_context.length > 0) {
        const last_message = new_messages_not_in_context[new_messages_not_in_context.length - 1];
        new_index = full_message_history.indexOf(last_message);
    }

    return [new_messages_not_in_context, new_index];
}

/**
 * This function takes a list of dictionaries representing new events and combines them with the current summary,
 * focusing on key and potentially important information to remember. The updated summary is returned in a message
 * formatted in the 1st person past tense.
 *
 * @param new_events - A list of dictionaries containing the latest events to be added to the summary.
 * @returns A message containing the updated summary of actions, formatted in the 1st person past tense.
 *
 * @example
 * const new_events = [
 *     {"event": "entered the kitchen."},
 *     {"event": "found a scrawled note with the number 7"}
 * ];
 * update_running_summary(new_events);
 * // Returns: "This reminds you of these events from your past: \nI entered the kitchen and found a scrawled note saying 7."
 */

export async function update_running_summary(
    agent: IAgent,
    current_memory: IChatMessage,
    new_events: IChatMessage[]
): Promise<IChatMessage> {
    const {logger} = agent;
    let new_events_text : string[] = [];

    for (let event of new_events) {
        if (event.role.toLowerCase() === 'assistant') {
            try {
                const contentDict = JSON.parse(event.content);
                if (contentDict.hasOwnProperty('thoughts')) {
                    delete contentDict.thoughts;
                }
                new_events_text.push("you: " + JSON.stringify(contentDict));
            } catch (err) {
                if ( agent.config.has_debug) {
                    logger.error(`Error: Invalid JSON: ${event.content}\n`);
                }
            }
        } else if (event.role.toLowerCase() === 'system') {
            new_events_text.push("your computer: " + event.content);
        } else if (event.role === 'user') {
        }
    }

    if (new_events_text.length === 0) {
        new_events_text.push( "Nothing new happened." );
    }

    const prompt = `Your task is to create a concise running summary of actions and information results in the provided text, focusing on key and potentially important information to remember.

    You will receive the current summary and your latest actions. Combine them, adding relevant key information from the latest development in 1st person past tense and keeping the summary concise.

    Summary So Far:
    """
    ${current_memory.content}
    """

    Latest Development:
    """
    ${new_events_text.join('\n')}
    """
    `;

    const messages: IChatMessage[] = [
        {
            role: "user",
            content: prompt,
        }
    ];

    logger.log_in_cycle_file(
        messages,
        PROMPT_SUMMARY_FILE_NAME,
    );

    let current_memory_str = await llm_create_chat_completion(agent, messages, agent.config.llm.models.fast_llm_model);

    logger.log_in_cycle_file(
        current_memory_str,
        SUMMARY_FILE_NAME,
    );

    const message_to_return: IChatMessage = {
        role: "system",
        content: `This reminds you of these events from your past: \n${current_memory_str}`,
    };

    return message_to_return;
}
