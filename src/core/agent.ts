import { DateTime } from 'luxon';
import { AIConfig, IAgent, IChatMessage, ICommandArgs, ILogger, IMemory, IRunParameters } from '../types';
import { Fore, Style, print_assistant_thoughts } from '../loggers/functions';
import { IOpenAIModel } from '../llm/models_info';
import { FULL_MESSAGE_HISTORY_FILE_NAME, NEXT_ACTION_FILE_NAME, USER_INPUT_FILE_NAME } from '../loggers/cycle_logger';
import path from 'path';
import { Workspace } from './workspace';
import { clean_input } from './utils';
import { LLM_DEFAULT_RESPONSE_FORMAT } from '../types/constants';
import { count_string_tokens } from '../llm/token_counter';
import { chat_with_ai } from '../llm/chat';
import { llm_fix_json_using_multiple_techniques } from '../llm/fix_json';
import { validate_json } from '../json/json';
import { llm_create_chat_completion } from '../llm/llm_utils';
import { say_text } from '../speech/say';
import { CommandRegistry, get_command_from_response } from './command_registry';
import { execute_command } from '../commands/functions';
import { loadEnv } from '../cli/loadenv';
import { ApiManager } from '../llm/api_manager';
import { getMemory } from '../memory';
import { TFunction } from 'i18next';
import { getTranslation } from '../i18n';
import Spinner from '../cli/spinner';

export type IBuildAgentOptions = {
    session_id: string,
    cfg: IRunParameters, 
    t: TFunction<"translation", undefined, "translation">,
    ai: AIConfig, 
    memory: IMemory, 
    full_message_history: IChatMessage[],
    next_action_count: number,
    system_prompt: string,
    triggering_prompt: string,
    api_manager: ApiManager,
    logger: ILogger

}

export async function buildTestAgent(logger: ILogger) : Promise<IAgent> {
    const wdit = path.resolve(__dirname, '../../test_workspace');
    const env = loadEnv();
    const t = await getTranslation('en');
    const cfg : IRunParameters = {
        ...env,
        can_speak: false,
        skip_reprompt: false,
        selected_browser: 'chrome',
        has_debug: false,
        plugins: [],
        workspace_directory: wdit,
        continuous: false,
        continuous_limit: 0,
        prompt_generator: null,
        command_registry: new CommandRegistry(),
    };
    return await buildAgent({
        session_id: Math.random().toString(36).substring(7),
        cfg,
        t,
        logger,
        api_manager: new ApiManager(),
        ai: {
            ai_name: 'test',
            ai_role: 'test',
            ai_goals: ['test'],
            api_budget: 100,
        },
        memory: await getMemory(cfg, logger),
        full_message_history: [],
        next_action_count: 0,
        system_prompt: '',
        triggering_prompt: '',
    });
}

export function buildAgent(options: IBuildAgentOptions) : IAgent {
    const {cfg, t, ai, memory, full_message_history, next_action_count, system_prompt, triggering_prompt} = options;
    return {
        ...ai,
        t,
        session_id: options.session_id,
        api_manager: options.api_manager,
        logger: options.logger,
        config: cfg,
        memory,
        summary_memory: { role: 'system', content: 'I was created.' },
        last_memory_index: 0,
        full_message_history,
        next_action_count,
        system_prompt,
        triggering_prompt,
        workspace: new Workspace(cfg.workspace_directory, cfg.options.restrict_to_workspace, options.logger),
        created_at: DateTime.now().toFormat('yyyyMMdd_HHmmss'),
        cycle_count: 0,
    }
}

function _resolve_pathlike_command_args(agent: IAgent, commandArgs: ICommandArgs): ICommandArgs {
    if ("directory" in commandArgs && commandArgs["directory"] === "" || commandArgs["directory"] === "/") {
        commandArgs["directory"] = agent.workspace.root;
      } else {
        const pathlikes = ["filename", "directory", "clone_path"];
        for (const pathlike of pathlikes) {
          if (pathlike in commandArgs) {
            commandArgs[pathlike] = String(agent.workspace.get_path(commandArgs[pathlike]));
          }
        }
      }
      return commandArgs;
  }
  
async function get_self_feedback(agent: IAgent, thoughts: any, llmModel: IOpenAIModel): Promise<string> {
    const ai_role: string = agent.ai_role;

    const feedback_prompt: string = `Below is a message from me, an AI Agent, assuming the role of ${ai_role}. whilst keeping knowledge of my slight limitations as an AI Agent Please evaluate my thought process, reasoning, and plan, and provide a concise paragraph outlining potential improvements. Consider adding or removing ideas that do not align with my role and explaining why, prioritizing thoughts based on their significance, or simply refining my overall thought process.`;
    const reasoning: string = thoughts["reasoning"] || "";
    const plan: string = thoughts["plan"] || "";
    const thought: string = thoughts["thoughts"] || "";
    const feedback_thoughts: string = thought + reasoning + plan;

    let temperature = agent.config.llm.provider.temperature;
    let max_tokens = agent.config.llm.models.fast_token_limit;   // TODO: check what limit to apply

    return await llm_create_chat_completion(
        agent, 
        [
            { role: "user", content: feedback_prompt + feedback_thoughts }
        ],
        llmModel,
        temperature,
        max_tokens
    );
}  
  
export async function start_interaction_loop(agent: IAgent): Promise<void> {
    agent.cycle_count = 0;
    let command_name: string | null = null;
    let args: ICommandArgs = {};
    let user_input: string = "";
    const cfg = agent.config;
    const {logger} = agent;

    const {t} = agent;

    logger.info(t("agent.start"));

    while (true) {
        logger.info(t("agent.new_cycle"));
        logger.start_cycle(agent.cycle_count, Math.random().toString(36).substring(7));
        logger.log_in_cycle_file(
            agent.full_message_history,
            FULL_MESSAGE_HISTORY_FILE_NAME
        );
        agent.cycle_count += 1;

        if (
            cfg.continuous &&
            cfg.continuous_limit > 0 &&
            agent.cycle_count > cfg.continuous_limit
        ) {
            logger.typewriter_log("Continuous Limit Reached: ",Fore.YELLOW,`${cfg.continuous_limit}`);
            break;
        }
        logger.info("AGENT: chat_with_ai()");
        // Send message ot AI, get response

        const spinner = new Spinner(t("agent.thinking") as string);
        spinner.start();
        // Start spinner (TODO)
        const assistant_reply = await chat_with_ai(
            agent,
            agent.system_prompt,
            agent.triggering_prompt,
            agent.full_message_history,
            agent.memory,
            cfg.llm.models.fast_token_limit
        ); // TODO: This hardcodes the model to use GPT3.5. Make this an argument
        spinner.stop();

        let assistant_reply_json = llm_fix_json_using_multiple_techniques (assistant_reply);

        for (const plugin of cfg.plugins) {
            if (!plugin.can_handle_post_planning()) {
                continue;
            }
            assistant_reply_json = plugin.post_planning(assistant_reply_json);
        }

        // Print Assistant thoughts
        if (assistant_reply_json !== false) {
            assistant_reply_json = validate_json(cfg, assistant_reply_json, LLM_DEFAULT_RESPONSE_FORMAT);

            try {
                print_assistant_thoughts(
                    agent.logger,
                    agent.ai_name,
                    assistant_reply_json,
                    cfg.can_speak || false
                );
                [command_name, args] = get_command_from_response(assistant_reply_json);

                if( command_name == 'Error') {
                    throw new Error( args['description']);
                }

                if (cfg.can_speak) {
                    say_text(t("agent.to_execute" + " " + command_name));
                }

                args = _resolve_pathlike_command_args(agent, args);
            } catch (e) {
                logger.error("Error:\n", (e as Error).message);
            }
        }

        logger.log_in_cycle_file(
            assistant_reply_json,
            NEXT_ACTION_FILE_NAME
        );

        logger.typewriter_log(
            "NEXT ACTION: ",
            Fore.CYAN,
            `COMMAND = ${Fore.CYAN}${command_name}${Style.RESET_ALL}  ` +
            `args = ${Fore.CYAN}` + JSON.stringify(args) + `${Style.RESET_ALL}`
        );

        if (!cfg.continuous && agent.next_action_count === 0) {
            user_input = "";
            logger.info( t("input.instructions")  + " " + agent.ai_name + '...');

            while (true) {
                let console_input: string;
                if (cfg.chat_plugin_settings.chat_messages_enabled) {
                    console_input = await clean_input(cfg, t("input.waiting") as string);
                } else {
                    console_input = await clean_input(cfg, `${Fore.MAGENTA}Input:${Style.RESET_ALL}` );
                }

                if (console_input.toLowerCase().trim() === cfg.options.authorise_command_key) {
                    user_input = "GENERATE NEXT COMMAND JSON";
                    break;
                } else if (console_input.toLowerCase().trim() === "s") {
                    logger.typewriter_log(
                        t("agent.will_verify_answer") as string, Fore.GREEN, ""
                    );
                    const thoughts = assistant_reply_json.thoughts || {};
                    const self_feedback_resp = await get_self_feedback( agent, thoughts, cfg.llm.models.fast_llm_model );
                    logger.typewriter_log( `SELF FEEDBACK: ${self_feedback_resp}`, Fore.YELLOW, "" );
                    user_input = self_feedback_resp;
                    command_name = "self_feedback";
                    break;
                } else if (console_input.toLowerCase().trim() === "") {
                    logger.warn(t("error.invalid_format"));
                    continue;
                } else if (console_input.toLowerCase().startsWith(`${cfg.options.authorise_command_key} -`)) {
                    try {
                        agent.next_action_count = Math.abs(
                            parseInt(console_input.split(" ")[1])
                        );
                        user_input = "GENERATE NEXT COMMAND JSON";
                    } catch (error) {
                        logger.warn( t("error.invalid_format_2") );
                        continue;
                    }
                    break;
                } else if (console_input.toLowerCase() === cfg.options.exit_key) {
                    user_input = "EXIT";
                    break;
                } else {
                    user_input = console_input;
                    command_name = "human_feedback";
                    logger.log_in_cycle_file(
                        user_input,
                        USER_INPUT_FILE_NAME
                    );
                    break;
                }
            }

            if (user_input === "GENERATE NEXT COMMAND JSON") {
                logger.typewriter_log(
                    t("typewriter.authorized") as string, Fore.MAGENTA, ""
                );
            } else if (user_input === "EXIT") {
                logger.info("Exiting...");
                break;
            }
        } else {
            logger.typewriter_log(
                Fore.CYAN + t("agent.authorized_left") + ` ${Style.RESET_ALL}{self.next_action_count}`
            );
        }

        let result : string|null = null;

        // Execute command
        if (command_name !== null && command_name.toLowerCase().startsWith("error")) {
            result = t("agent.command_error", { command_name, error: args });
        } else if (command_name === "human_feedback") {
            result = t("agent.human_feedback") + ` ${user_input}`;
        } else if (command_name === "self_feedback") {
            result = t("agent.self_feedback") + ` ${user_input}`;
        } else if( command_name !== null ) {
            for (const plugin of cfg.plugins) {
                if (!plugin.can_handle_pre_command()) {
                    continue;
                }
                [command_name, args] = plugin.pre_command(command_name, args);
            }
            const command_result = await execute_command(
                agent,
                command_name,
                args
            );
            result = t("agent.command_returned", {command_name, command_result});

            const result_tlength = count_string_tokens(
                String(command_result),
                cfg.llm.models.fast_llm_model
            );
            const memory_tlength = count_string_tokens(
                String(agent.summary_memory),
                cfg.llm.models.fast_llm_model
            );
            if (result_tlength + memory_tlength + 600 > cfg.llm.models.fast_token_limit) {
                // `Failure: command ${command_name} returned too much output. Do not execute this command again with the same args.`;
                result = t("agent.command_too_much_output", {command_name});
            }

            for (const plugin of cfg.plugins) {
                if (!plugin.can_handle_post_command()) {
                    continue;
                }
                result = plugin.post_command(command_name, result);
            }
            if (agent.next_action_count > 0) {
                agent.next_action_count -= 1;
            }
        }

        // Check if there's a result from the command append it to the message  history
        if (result !== null) {
            agent.full_message_history.push({role: "system", content: result});

            logger.typewriter_log( t("typewriter.system"), Fore.YELLOW, result);
        } else {
            agent.full_message_history.push(
                {role: "system", content: t("agent.error_unable") }
            );
            logger.typewriter_log( t("typewriter.system"), Fore.YELLOW, t("agent.error_unable") as string );
        }
    } // End of while(true)
}

