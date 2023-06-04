
import { AIConfig, loadAIConfig, promptUser, saveAIConfig } from './ai_config';
import { ILogger, IRunParameters } from '../types';
import { Fore } from '../loggers/functions';
import { clean_input } from './utils';
import PromptGeneratorImpl, { IPromptGenerator } from './prompt_generator';
import { TFunction } from 'i18next';


export const DEFAULT_TRIGGERING_PROMPT = "Determine which next command to use, and respond using the format specified above:";

export function build_default_prompt_generator(): IPromptGenerator {
  const prompt_generator = new PromptGeneratorImpl();

  prompt_generator.add_constraint(
    "~4000 word limit for short term memory. Your short term memory is short, so immediately save important information to files."
  );
  prompt_generator.add_constraint(
    "If you are unsure how you previously did something or want to recall past events, thinking about similar events will help you remember."
  );
  prompt_generator.add_constraint("No user assistance");
  prompt_generator.add_constraint('Exclusively use the commands listed in double quotes e.g. "command name"');

  prompt_generator.add_resource("Internet access for searches and information gathering.");
  prompt_generator.add_resource("Long Term memory management.");
  prompt_generator.add_resource("GPT-3.5 powered Agents for delegation of simple tasks.");
  prompt_generator.add_resource("File output.");

  prompt_generator.add_performance_evaluation("Continuously review and analyze your actions to ensure you are performing to the best of your abilities.");
  prompt_generator.add_performance_evaluation("Constructively self-criticize your big-picture behavior constantly.");
  prompt_generator.add_performance_evaluation("Reflect on past decisions and strategies to refine your approach.");
  prompt_generator.add_performance_evaluation("Every command has a cost, so be smart and efficient. Aim to complete tasks in the least number of steps.");
  prompt_generator.add_performance_evaluation("Write all code to a file.");

  return prompt_generator;
}


export async function construct_main_ai_config(cfg: IRunParameters, logger: ILogger, t: TFunction): Promise<AIConfig> {
  let config = loadAIConfig( cfg.options.ai_settings_file);

  if (cfg.skip_reprompt && config.ai_name) {
    logger.typewriter_log(t("prompt.name"), Fore.GREEN, config.ai_name);
    logger.typewriter_log(t("prompt.role"), Fore.GREEN, config.ai_role);
    logger.typewriter_log(t("prompt.goals"), Fore.GREEN, `${config.ai_goals}`);
    logger.typewriter_log(t("prompt.api_budget"), Fore.GREEN, config.api_budget <= 0 ? (t("infinite") as string) : `$${config.api_budget}`);
  } else if (config.ai_name) {
    logger.typewriter_log(t("typewriter.welcome_back"), Fore.GREEN, t("prompt.restore", {ai_name: config.ai_name}) as string, true);
    const should_continue = await clean_input(
        cfg,
      t("prompt.continue_with_last") + "\n" +
      t("prompt.name") + config.ai_name + "\n" +
      t("prompt.role") + config.ai_role + "\n" +
      t("prompt.goals") + config.ai_goals + "\n" +
      t("prompt.api_budget") + (config.api_budget <= 0 ? (t("infinite") as string) : `$${config.api_budget}`) + "\n" +
      t("prompt.continue") + ` (${cfg.options.authorise_command_key}/${cfg.options.exit_key}): `
    );
    if (should_continue.toLowerCase() === cfg.options.exit_key) {
      config = {
        ai_name: "",
        ai_role: "",
        ai_goals: [],
        api_budget: 0
      }
    }
  }

  if (!config.ai_name) {
    config = await promptUser(cfg, t);
    saveAIConfig(config, cfg.options.ai_settings_file);
  }
/*
  const api_manager = new ApiManager();
  api_manager.set_total_budget(config.api_budget);

  logger.typewriter_log(config.ai_name, Fore.LIGHTBLUE_EX, "has been created with the following details:", true);

  logger.typewriter_log("Name:", Fore.GREEN, config.ai_name, false);
  logger.typewriter_log("Role:", Fore.GREEN, config.ai_role, false);
  logger.typewriter_log("Goals:", Fore.GREEN, "", false);
  for (const goal of config.ai_goals) {
    logger.typewriter_log("-", Fore.GREEN, goal, false);
  }
*/
  return config;
}
