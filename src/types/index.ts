import { TiktokenEncoding } from "@dqbd/tiktoken";
import { ApiManager } from "../llm/api_manager";
import { IOpenAIModel } from "../llm/models_info";
import { IPromptGenerator } from "../core/prompt_generator";
import { CommandRegistry } from "../core/command_registry";
import { Workspace } from "core/workspace";
import { TFunction } from "i18next";

export type ICommandCategory = 'analyze_code'|'audio_text'|'execute_code'|'file_operations'|'git_operations'|'google_search'|'image_gen'|'improve_code'|'twitter'|'web_selenium'|'write_tests'|'app'|'task_statuses'|'console'|'core';

export type IMemoryBackend = 'local'|'pinecone'|'redis'|'milvus';

export type ILanguageCode = 'en'|'es';

/**
 * This structure holds the environment variables taken from the .env file, some of them are commented out with #
 */
export type Env = {
    language: ILanguageCode,
    options: {
        execute_local_commands: boolean,        // Allow local command execution (Default: False)
        restrict_to_workspace: boolean,         // Restrict file operations to workspace ./auto_gpt_workspace (Default: True)
        user_agent: string,                     // Define the user-agent used by the requests library to browse website (string)
        ai_settings_file: string,               // Specifies which AI Settings file to use (defaults to ai_settings.yaml)
        prompt_settings_file: string,           // Specifies which Prompt Settings file to use (defaults to prompt_settings.yaml)
        authorise_command_key: string,          // Key to authorise commands (default 'y')
        exit_key: string,                       // Key to exit the program (default 'n')
        disabled_command_categories?: ICommandCategory[],
        deny_commands?: string[],
        allow_commands?: string[],
    },
    llm: {
        provider: {
            openai_api_key: string,
            temperature: number,               // Default: 0
            use_azure?: boolean,                 // Default: False
        },
        models: {
            smart_llm_model: string,            // Default: gpt-4
            fast_llm_model: IOpenAIModel,             // Default: gpt-3.5-turbo
            fast_token_limit: number,           // Default: 4000
            smart_token_limit: number,          // Default: 8000
        },
        embeddings: {
            model: IOpenAIModel,           // Model to use for creating embeddings
            tokenizer: TiktokenEncoding,       // Tokenizer to use for chunking large inputs
            token_limit: number      // Chunk size limit for large inputs
        },
    },
    memory: {
        backend: IMemoryBackend,                // Default: local
        index: string,                          // Default: auto-gpt
    },
    pinecone: {
        api_key?: string,
        env?: string,
    },
    redis: {
        host?: string,
        port?: number,
        password?: string,
        wipe_redis_on_start?: boolean,
    },
    weaviate: {
        host?: string,
        port?: number,
        protocol?: string,
        use_weaviate_embedded?: boolean,
        embedded_path?: string,
        username?: string,
        password?: string,
        api_key?: string,
    },
    milvus: {
        addr?: string,
        username?: string,
        password?: string,
        secure?: boolean,
        collection?: string,
    },
    image_generation_provider: {
        provider?: string,
        size?: number,
        huggingface_image_model?: string,
        huggingface_api_token?: string,
        sd_webui_auth?: string,
        sd_webui_url?: string,
    },
    audio_to_text_provider: {
        provider?: string,
        huggingface_model?: string,
    },
    github: {
        api_key?: string,
        username?: string,
    },
    browser: {
        headless_browser?: boolean,
        use_web_browser: string,
        browse_chunk_max_length?: number,
        browse_spacy_language_model?: string,
    },
    google: {
        api_key?: string,
        custom_search_engine_id?: string,
    },
    tts_provider: {
        use_mac_os_tts?: boolean,
        use_brian_tts?: boolean,
        elevenlabs: {
            api_key?: string,
            voice_1_id?: string,
            voice_2_id?: string,
        },
    },
    twitter_api: {
        consumer_key?: string,
        consumer_secret?: string,
        access_token?: string,
        access_token_secret?: string,
    },
    allowlisted_plugins?: string[],
    denylisted_plugins?: string[],
    chat_plugin_settings: {
        chat_messages_enabled?: boolean,
    },
}

export type ICliArguments = {
    continuous: boolean,
    skipReprompt?: boolean,
    aiSettings?: string,
    continuousLimit?: string,
    speak?: boolean,
    debug?: boolean,
    gpt3only?: boolean,
    gpt4only?: boolean,
    useMemory?: string,
    browserName?: string,
    allowDownloads?: boolean,
    skipNews?: boolean,
    workspaceDirectory?: string,
    installPluginDeps?: boolean,
}

export type IMessageRole = 'user'|'system'|'assistant';

export type IChatMessage = {
    role: IMessageRole,
    content: string,
  }
  

export type IPlugin = {
    classname: string,
    can_handle_user_input?: ({ user_input }: { user_input: string }) => boolean,
    user_input: ({ user_input }: { user_input: string }) => string,
    can_handle_report?: () => boolean,
    can_handle_post_prompt: () => boolean,
    post_prompt: (pg: IPromptGenerator) => IPromptGenerator,
    can_handle_chat_completion: ({messages, model, temperature, max_tokens}: {messages: IChatMessage[], model: string, temperature?: number, max_tokens?: number}) =>boolean,
    handle_chat_completion: ({messages, model, temperature, max_tokens}: {messages: IChatMessage[], model: string, temperature?: number, max_tokens?: number}) => string,
    can_handle_on_response: () => boolean,
    on_response: (response: string) => string,
    can_handle_post_planning: () => boolean,
    post_planning: (input: any) => any,
    can_handle_pre_command: () => boolean,
    pre_command: (command_name: string, input: any) => [string, any],
    can_handle_post_command: () => boolean,
    post_command: (command_name: string, input: any) => any,
    can_handle_on_planning: () => boolean,
    on_planning: (prompt: IPromptGenerator, input: any) => any,
}

export interface IAzureConfig {
    openai_api_type: string;
    openai_api_base: string;
    openai_api_version: string;
    azure_model_to_deployment_id_map: { [key: string]: string };
}


export type IMemory = {
    classname: string,
    add(text: string): Promise<string>;
    clear(): Promise<string>;
    get(agent: IAgent, data: string): Promise<string[]> | null;
    get_relevant( agent: IAgent, text: string, k: number): Promise<string[]>;
    get_stats(): [number, number[]];
}

export type ICommandArgs = Record<string,any>;

/**
 * Extra data that can be passed to a command
 */
export type ICommandContext = Pick<Env,'llm'|'browser'> & 
{
    agent: IAgent
}

export type ICommandFunction = (ctx: ICommandContext, ...args: any[]) => Promise<any>;

export type ICommand = {
  name: string;
  description: string;
  method: ICommandFunction;
  signature?: string;
  enabled: (cfg: IRunParameters) => boolean;
  disabled_reason?: string | null;
  categories: ICommandCategory[];   // This is used to restrict what commands are available for the AI
  returns: string;
}

export type IRunningCommand = ICommand & {
  args?: ICommandArgs;
};

export type ILogger = {
    typewriter_log: (header: string, color?: string, text?: string, x?: boolean) => void;
    info: (text: string) => void,
    debug: (text: string, extra?: string|number) => void,
    warn: (text: string) => void,
    error: (text: string, extra?: string|number) => void,
    chat_plugins?: IPlugin[],
    double_check: () => void,
    log_operation: (operation: string, extra?: string|number, params?: Object) => void,
    is_duplicate_operation: (operation: string, extra?: string|number, params?: Object) => boolean,
    start_cycle: (index: number, name: string) => void,
    log_in_cycle_file: (data: Record<string,any>|string, filename: string) => void
}

// This gets stored in auto-gpt.json. It holds the main task to perform.
export type AIConfig = {
    ai_name: string;
    ai_role: string;
    ai_goals: string[];
    api_budget: number;
  };
  
/**
 * Read only parameters, coming from environment, CLI command parameters and initial setup.
 * These parameters could be shared between different runs.
 */
export type IRunParameters = Env & {
    can_speak: boolean,
    skip_reprompt: boolean,
    selected_browser: string,
    has_debug: boolean,
    plugins: IPlugin[],
    azure?: IAzureConfig,
    prompt_generator: IPromptGenerator | null;
    command_registry: CommandRegistry;
    workspace_directory: string;
    continuous: boolean,
    continuous_limit: number,
    allow_downloads?: boolean,
}

/**
 * The Agent holds required configuration, and helpers to run the AI (logger, memory, etc.)
 */
export interface IAgent extends AIConfig {
    session_id: string;                 // This is the unique ID for the current session
    t: TFunction<"translation", undefined, "translation">,
    logger: ILogger,
    api_manager: ApiManager,
    memory: IMemory;
    summary_memory: IChatMessage;
    last_memory_index: number;
    full_message_history: IChatMessage[];
    next_action_count: number;
    config: IRunParameters;
    system_prompt: string;
    triggering_prompt: string;
    workspace: Workspace;
    created_at: string;
    cycle_count: number;
}
  
export type Callable = (...args: any[]) => any;

//type exports = { Env };
export default exports;