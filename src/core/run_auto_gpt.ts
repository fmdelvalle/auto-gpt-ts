import { Env, ICliArguments, ICommandCategory, IPlugin, IRunParameters } from "../types";
import getLatestBulletin, { load_all_plugins, markdownToAnsiStyle } from "./utils";
import * as Path from 'path';
import { CommandRegistry } from "./command_registry";
import { DEFAULT_TRIGGERING_PROMPT, construct_main_ai_config } from "./prompt";
import { Fore, prepare_complete_logger } from "../loggers/functions";
import { getMemory } from "../memory";
import { loadAzureConfig } from "./azure";
import { ApiManager } from "../llm/api_manager";
import { constructFullPrompt } from "./ai_config";
import { buildAgent, start_interaction_loop } from "./agent";
import { getTranslation } from "../i18n";
import * as fs from 'fs';

// @ts-ignore
export async function run_auto_gpt( cfg: ICliArguments, env: Env ) {

    const t = await getTranslation(env.language);
/*    
    logger.setLevel(cmd.debug ? logging.DEBUG : logging.INFO);
    logger.speak_mode = cmd.speak;
    */

    // Generate a random, short unique name for this session
    const session_id = Math.random().toString(36).substring(2, 8);

    if(!env.llm.provider.openai_api_key) {
        console.error(t("openapi1"));
        console.log(t("openapi2") + "( https://platform.openai.com/account/api-keys");
        throw new Error(t("openapierror") as string);
    }
    
    if (!cfg.skipNews) {
        let [motd, is_new_motd] = await getLatestBulletin( env.language, t );
        if (motd) {
            motd = markdownToAnsiStyle(motd);
            motd.split('\n').forEach((motd_line) => {
                console.log( motd_line );
                //logger.info(motd_line, 'NEWS:', Fore.GREEN);
            });
            if (is_new_motd && !env.chat_plugin_settings.chat_messages_enabled) {
                console.warn(t("newbulletin"));
            }
        }

        // Here we could verify the environment is set up correctly
    }
    // Here we could check plugins and install their dependencies

    // Make needed directories (TODO)
   

    let workspace_directory;
    if (!cfg.workspaceDirectory) {
        workspace_directory = Path.resolve(__dirname, '../../auto_gpt_workspace/' + session_id);
    } else {
        workspace_directory = Path.resolve(cfg.workspaceDirectory);
    }

    const logger = await prepare_complete_logger( workspace_directory );

    // Load all plugins (some may be disabled in the config)
    const all_plugins = await load_all_plugins(logger, t);

    // Filter out plugins that are disabled in the config, or that are not enabled.
    // Note: if allowlisted_plugins is set, only included plugins will be loaded. 
    // Otherwise, all plugins will be loaded as long as they are not denylisted.
    const enabled_plugins : IPlugin[] = all_plugins.filter((plugin) => {
        if(env.allowlisted_plugins) {
            return env.allowlisted_plugins.includes(plugin.classname);
        } else if(env.denylisted_plugins) {
            return !env.denylisted_plugins.includes(plugin.classname);
        } 
        return true;
    });

    let run_cfg : IRunParameters = {
        ...env,
        can_speak: cfg.speak || false,
        skip_reprompt: cfg.skipReprompt || false,
        selected_browser: cfg.browserName || env.browser.use_web_browser,
        has_debug: cfg.debug || false,
        plugins: [],
        azure: env.llm.provider.use_azure ? loadAzureConfig( Path.resolve(workspace_directory, 'azure.yaml') ) : undefined,
        prompt_generator: null,
        command_registry: new CommandRegistry(),
        workspace_directory,
        continuous: cfg.continuous,
        continuous_limit: cfg.continuousLimit ? parseInt(cfg.continuousLimit) : 0,
        allow_downloads: cfg.allowDownloads
    };

    // Load core commands
    await run_cfg.command_registry.import_all_commands( env, t );

    // Plugins can add themselves as commands to the command registry. ChatGPT will have the option to call them.
    await run_cfg.command_registry.add_plugin_commands( logger, t, enabled_plugins );

    // They can also add extra loggers to the stack
    for (const plugin of enabled_plugins) {
        if(plugin.on_add_logger) {
            logger.push( await plugin.on_add_logger() );
            logger.info(t("plugin.logger_appended", {classname: plugin.classname} ));
        }
    }

    const ai_config = await construct_main_ai_config( run_cfg, logger, t );

    // TODO: some plugins could be interested in receiving log messages (which ones? maybe they should add some logger to the stack?)
    /*
    if (run_cfg.chat_plugin_settings.chat_messages_enabled) {
        for (const plugin of run_cfg.plugins) {
            if (plugin.can_handle_report && plugin.can_handle_report()) {
                logger.info(`Loaded plugin into logger: ${plugin.classname}`);
                logger.chat_plugins.push(plugin);
            }
        }
    }
    */

    const memory = await getMemory (run_cfg, logger, true);
    logger.typewriter_log(t("using_memory"), Fore.GREEN, memory.classname);
    logger.typewriter_log(t("using_browser"), Fore.GREEN, run_cfg.selected_browser );
    logger.typewriter_log(t('Session ID:'), session_id);

    const system_prompt = constructFullPrompt(run_cfg, ai_config);
    if (run_cfg.has_debug) {
        logger.typewriter_log(t("prompt:"), Fore.GREEN, system_prompt);
    }

    const agent = buildAgent({
        session_id,
        t,
        ai: ai_config,
        cfg: run_cfg,
        memory,
        logger,
        api_manager: new ApiManager(),
        full_message_history: [],
        next_action_count: 0,
        system_prompt,
        triggering_prompt: DEFAULT_TRIGGERING_PROMPT,
    });

    await start_interaction_loop(agent);
}
