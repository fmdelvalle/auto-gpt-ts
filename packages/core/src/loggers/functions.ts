import path from "path";
import { say_text } from "../speech/say";
import { ILogger, IPlugin } from "../types";
import * as fs from 'fs';
import CycleLogger from "./cycle_logger";
import StackLogger from "./stack_logger";
import { OperationsLogger } from "./operations_logger";
import FileLogger from "./file_logger";

/**
 * Prepare a logger that will log to console, to file, keep track of performed operations, and log cycles information
 * @param directory base directory where to store the log files
 * @returns StackLogger
 */
export async function prepare_complete_logger( directory: string, extra_loggers: Partial<ILogger>[] ) {
    const final_directory = directory.startsWith('/') ? directory : path.resolve(__dirname, '../../auto_gpt_workspace/' + directory );
    try {
        await fs.promises.mkdir(final_directory, {recursive: true} );
    } catch(e) {
        console.warn("Error creating directory: ", e);
    }
    const file_logger = new FileLogger( directory + '/log.txt' );
    const operations_logger = new OperationsLogger();
    const cycle_logger = new CycleLogger( directory );
    return new StackLogger([file_logger, operations_logger, cycle_logger, ...extra_loggers]);
}

/**
 * Returns a simpler logger for testing (console and temporary file)
 * @returns StackLogger
 */
export async function prepare_test_logger(extra_loggers: Partial<ILogger>[]) {
    const file_logger = new FileLogger( '/tmp/test_log.txt' );
    const operations_logger = new OperationsLogger();
    return new StackLogger([file_logger, operations_logger, ...extra_loggers]);
}

export const Fore = {
    GREEN: '\x1b[32m',
    LIGHTBLUE_EX: '\x1b[94m',
    MAGENTA: '\x1b[35m',
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    WHITE: '\x1b[37m',
    CYAN: '\x1b[36m',
    RESET: '\x1b[0m'
}

export const Style = {
    RESET_ALL: '\x1b[0m',
}

export function print_assistant_thoughts(
    logger: ILogger,
    ai_name: string,
    assistant_reply_json_valid: Record<string,any>,
    speak_mode: boolean = false
): void {
    let assistant_thoughts_reasoning: any = null;
    let assistant_thoughts_plan: any = null;
    let assistant_thoughts_speak: any = null;
    let assistant_thoughts_criticism: any = null;

    const assistant_thoughts: any = assistant_reply_json_valid['thoughts'] || {};
    const assistant_thoughts_text: any = assistant_thoughts.text;

    if (assistant_thoughts) {
        assistant_thoughts_reasoning = assistant_thoughts.reasoning;
        assistant_thoughts_plan = assistant_thoughts.plan;
        assistant_thoughts_criticism = assistant_thoughts.criticism;
        assistant_thoughts_speak = assistant_thoughts.speak;
    }

    logger.typewriter_log(`${ai_name.toString().toUpperCase()} THOUGHTS:`, Fore.YELLOW, `${assistant_thoughts_text}`);
    logger.typewriter_log("REASONING:", Fore.YELLOW, `${assistant_thoughts_reasoning}`);

    if (assistant_thoughts_plan) {
        logger.typewriter_log("PLAN:", Fore.YELLOW, "");

        if (Array.isArray(assistant_thoughts_plan)) {
            assistant_thoughts_plan = assistant_thoughts_plan.join("\n");
        } else if (typeof assistant_thoughts_plan === "object") {
            assistant_thoughts_plan = JSON.stringify(assistant_thoughts_plan);
        }

        const lines = assistant_thoughts_plan.split("\n");
        for (let line of lines) {
            line = line.replace(/^- /, "").trim();
            logger.typewriter_log("- ", Fore.GREEN, line);
        }
    }

    logger.typewriter_log("CRITICISM:", Fore.YELLOW, `${assistant_thoughts_criticism}`);

    if (speak_mode && assistant_thoughts_speak) {
        say_text(assistant_thoughts_speak);
    }
}
