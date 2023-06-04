/**
 * This function uses dotenv to load the .env file into a new typed structure
 */

import dotenv from 'dotenv';
import { Env, ICommandCategory, ILanguageCode, IMemoryBackend } from '../types/index';
import { TiktokenEncoding } from '@dqbd/tiktoken';
import { IOpenAIModel } from '../llm/models_info';

dotenv.config();

export const loadEnv = (): Env => {
    let ret : Env = {
        language: process.env.USER_LANGUAGE as ILanguageCode || 'en',
        options: {
            execute_local_commands: process.env.EXECUTE_LOCAL_COMMANDS === 'true' ? true : false,
            restrict_to_workspace: process.env.RESTRICT_TO_WORKSPACE === 'false' ? false : true,
            user_agent: process.env.USER_AGENT || 'auto-gpt',
            ai_settings_file: process.env.AI_SETTINGS_FILE || 'ai_settings.yaml',
            prompt_settings_file: process.env.PROMPT_SETTINGS_FILE || 'prompt_settings.yaml',
            authorise_command_key: process.env.AUTHORISE_COMMAND_KEY || 'y',
            exit_key: process.env.EXIT_KEY || 'n',
            disabled_command_categories: (process.env.DISABLED_COMMAND_CATEGORIES ? process.env.DISABLED_COMMAND_CATEGORIES.split(',') : []) as ICommandCategory[],
            deny_commands: process.env.DENY_COMMANDS ? process.env.DENY_COMMANDS.split(',') : undefined,
            allow_commands: process.env.ALLOW_COMMANDS ? process.env.ALLOW_COMMANDS.split(',') : undefined,
        },
        llm: {
            provider: {
                openai_api_key: process.env.OPENAI_API_KEY || '',
                temperature: process.env.TEMPERATURE ? parseFloat(process.env.TEMPERATURE) : 0,
                use_azure: process.env.USE_AZURE === 'true' ? true : false,
            },
            models: {
                smart_llm_model: process.env.SMART_LLM_MODEL || 'gpt-4',
                fast_llm_model: (process.env.FAST_LLM_MODEL as IOpenAIModel) || 'gpt-3.5-turbo',
                fast_token_limit: process.env.FAST_TOKEN_LIMIT ? parseInt(process.env.FAST_TOKEN_LIMIT) : 4000,
                smart_token_limit: process.env.SMART_TOKEN_LIMIT ? parseInt(process.env.SMART_TOKEN_LIMIT) : 8000,
            },
            embeddings: {
                model: (process.env.model as IOpenAIModel) || 'text-embedding-ada-002',
                tokenizer: (process.env.tokenizer as TiktokenEncoding) || 'cl100k_base',
                token_limit: process.env.EMBEDDING_TOKEN_LIMIT ? parseInt(process.env.EMBEDDING_TOKEN_LIMIT) : 8191,
            },
        },
        memory: {
            backend: (process.env.MEMORY_BACKEND as IMemoryBackend) || 'local',
            index: process.env.MEMORY_INDEX || 'auto-gpt',
        },
        pinecone: {
            api_key: process.env.PINECONE_API_KEY,
            env: process.env.PINECONE_ENV,
        },
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
            password: process.env.REDIS_PASSWORD,
            wipe_redis_on_start: process.env.WIPE_REDIS_ON_START === 'true' ? true : false,
        },
        weaviate: {
            host:  process.env.WEAVIATE_HOST,
            port: process.env.WEAVIATE_PORT ? parseInt(process.env.WEAVIATE_PORT) : undefined,
            protocol: process.env.WEAVIATE_PROTOCOL,
            use_weaviate_embedded: process.env.USE_WEAVIATE_EMBEDDED === 'true' ? true : false,
            embedded_path: process.env.EMBEDDED_PATH,
            username: process.env.WEAVIATE_USERNAME,
            password: process.env.WEAVIATE_PASSWORD,
            api_key: process.env.WEAVIATE_API_KEY,
        },
        milvus: {
            addr: process.env.MILVUS_ADDR,
            username: process.env.MILVUS_USERNAME,
            password: process.env.MILVUS_PASSWORD,
            secure: process.env.MILVUS_SECURE === 'true' ? true : false,
            collection: process.env.MILVUS_COLLECTION,
        },
        image_generation_provider: {
            provider: process.env.IMAGE_GENERATION_PROVIDER,
            size: process.env.IMAGE_GENERATION_SIZE ? parseInt(process.env.IMAGE_GENERATION_SIZE) : undefined,
            huggingface_image_model: process.env.HUGGINGFACE_IMAGE_MODEL,
            huggingface_api_token: process.env.HUGGINGFACE_API_TOKEN,
            sd_webui_auth: process.env.SD_WEBUI_AUTH,
            sd_webui_url: process.env.SD_WEBUI_URL,
        },
        audio_to_text_provider: {
            provider: process.env.AUDIO_TO_TEXT_PROVIDER,
            huggingface_model: process.env.HUGGINGFACE_MODEL,
        },
        github: {
            api_key: process.env.GITHUB_API_KEY,
            username: process.env.GITHUB_USERNAME,
        },
        browser: {
            headless_browser: process.env.HEADLESS_BROWSER === 'false' ? false : true,
            use_web_browser: process.env.USE_WEB_BROWSER || 'chrome',
            browse_chunk_max_length: process.env.BROWSE_CHUNK_MAX_LENGTH ? parseInt(process.env.BROWSE_CHUNK_MAX_LENGTH) : undefined,
            browse_spacy_language_model: process.env.BROWSE_SPACY_LANGUAGE_MODEL,
        },
        google: {
            api_key: process.env.GOOGLE_API_KEY,
            custom_search_engine_id: process.env.CUSTOM_SEARCH_ENGINE_ID,
        },
        tts_provider: {
            use_mac_os_tts: process.env.USE_MAC_OS_TTS === 'true' ? true : false,
            use_brian_tts: process.env.USE_BRIAN_TTS === 'true' ? true : false,
            elevenlabs: {
                api_key: process.env.ELEVENLABS_API_KEY,
                voice_1_id: process.env.ELEVENLABS_VOICE_1_ID,
                voice_2_id: process.env.ELEVENLABS_VOICE_2_ID,
            },
        },
        twitter_api: {
            consumer_key: process.env.TWITTER_CONSUMER_KEY,
            consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
            access_token: process.env.TWITTER_ACCESS_TOKEN,
            access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        },
        allowlisted_plugins: process.env.ALLOWLISTED_PLUGINS ? process.env.ALLOWLISTED_PLUGINS.split(',') : undefined,
        denylisted_plugins: process.env.DENYLISTED_PLUGINS ? process.env.DENYLISTED_PLUGINS.split(',') : undefined,
        chat_plugin_settings: {
            chat_messages_enabled: process.env.CHAT_MESSAGES_ENABLED === 'true' ? true : false,
        },
    };
    return ret;
}

