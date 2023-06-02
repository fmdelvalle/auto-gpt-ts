import { IAgent, ICommandArgs, ICommandContext } from "../types";

// Unique identifier for auto-gpt commands
const AUTO_GPT_COMMAND_IDENTIFIER = "auto_gpt_command";

function map_command_synonyms(command_name: string): string {
    const synonyms: [string, string][] = [
        ["write_file", "write_to_file"],
        ["create_file", "write_to_file"],
        ["search", "google"],
    ];
    for (const [seen_command, actual_command_name] of synonyms) {
        if (command_name === seen_command) {
            return actual_command_name;
        }
    }
    return command_name;
}


export async function execute_command(
    agent: IAgent,
    command_name: string,
    args: ICommandArgs
): Promise<string> {
    const {config, t} = agent;
    const {command_registry, prompt_generator: prompt} = config;
    if( prompt === null ) {
        throw new Error(t("command.no_prompt_generator") as string);
    }
    try {
        const cmd = command_registry.commands[command_name];

        // If the command is found, call it with the provided args
        if (cmd) {
            const ctx : ICommandContext = {
                agent: agent,
                ...config,
            }
            return await cmd.method(ctx, args);
        }

        // TODO: Remove commands below after they are moved to the command registry.
        command_name = map_command_synonyms(command_name.toLowerCase());

        // TODO: this will never get executed. We should promote it to a real command
        if (command_name === "memory_add") {
            const memory = agent.memory;
            return await memory.add(args["string"]);
        }
        else {
            for (const command of prompt.commands) {
                if (
                    command_name === command["label"].toLowerCase()
                    || command_name === command["name"].toLowerCase()
                ) {
                    return command.function(args);
                }
            }
            return t( "command.unknown_command", {command_name} ) as string;
        }
    } catch (error) {
        return `Error: ${error}`;
    }
}

