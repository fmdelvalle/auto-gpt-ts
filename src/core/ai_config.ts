import platform from 'platform';
import { PathLike, readFileSync, writeFileSync } from 'fs';
import yaml from 'yaml';
import { clean_input } from './utils';
import { AIConfig, IRunParameters } from '../types';
import { build_default_prompt_generator } from './prompt';
import { IPromptGenerator } from './prompt_generator';
import { TFunction } from 'i18next';

function loadAIConfig(config_file: PathLike): AIConfig {
  let config_params: any = {};

  try {
    const fileContents = readFileSync(config_file, { encoding: "utf-8" });
    config_params = yaml.parse(fileContents);
  } catch (error) {}

  const ai_name = config_params.ai_name || "";
  const ai_role = config_params.ai_role || "";
  const ai_goals = config_params.ai_goals?.map((goal: any) => {
    if (typeof goal === "object") {
      return goal.toString().replace(/[{}'"]/g, "").trim();
    }
    return goal.toString();
  });
  const api_budget = config_params.api_budget || 0.0;

  return {
    ai_name,
    ai_role,
    ai_goals,
    api_budget
  };
}

function saveAIConfig(config: AIConfig, config_file: PathLike): void {
  const { ai_name, ai_role, ai_goals, api_budget } = config;

  const configData = {
    ai_name,
    ai_role,
    ai_goals,
    api_budget,
  };

  const yamlData = yaml.stringify(configData);
  writeFileSync(config_file, yamlData, { encoding: "utf-8" });
}

function constructFullPrompt(cfg: IRunParameters, config: AIConfig, prompt_generator?: IPromptGenerator): string {
  let prompt_start = `
    Your decisions must always be made independently without seeking user assistance. Play to your strengths as an LLM and pursue simple strategies with no legal complications.
  `;

  const os_name = platform.os?.family;
  let os_info = platform.os?.toString();
  if (os_name === "Linux") {
    os_info = platform.description;// .linuxName(true);
  }

  prompt_start += `\nThe platform you are running on is: ${os_info}`;

  if( !prompt_generator ) {
    prompt_generator = build_default_prompt_generator()
    prompt_generator.goals = config.ai_goals;
    prompt_generator.name = config.ai_name;
    prompt_generator.role = config.ai_role;
  }

  let full_prompt = `You are ${config.ai_name}, ${config.ai_role}\n${prompt_start}\n\nGOALS:\n\n`;
  for (let i = 0; i < config.ai_goals.length; i++) {
    const goal = config.ai_goals[i];
    full_prompt += `${i + 1}. ${goal}\n`;
  }
  if (config.api_budget > 0.0) {
    full_prompt += `\nIt takes money to let you run. Your API budget is $${config.api_budget.toFixed(3)}`;
  }
  cfg.prompt_generator = prompt_generator || null;
  // TODO: check behaviour
  if( !cfg.prompt_generator ) {
    console.error("No prompt generator provided to constructFullPrompt");
  } else {
    full_prompt += `\n\n${cfg.prompt_generator.generate_prompt_string(cfg)}`;
  }

  return full_prompt;
}


export async function generateAIConfigManual(cfg: IRunParameters, t: TFunction): Promise<AIConfig> {
    // Prompt for AI name
    const ai_name = await clean_input(cfg, t("prompt.ai_name") as string);
  
    // Prompt for AI role
    const ai_role = await clean_input(cfg, t("prompt.ai_role") as string);
  
    // Prompt for AI goals
    const aiGoals: string[] = [];
    let aiGoal = await clean_input(cfg, t("prompt.ai_goal") as string);
    while (aiGoal !== '') {
      aiGoals.push(aiGoal);
      aiGoal = await clean_input(cfg, t("prompt.ai_goal_2") as string);
    }
  
    // Prompt for API budget
    const apiBudgetInput = await clean_input(cfg, t("prompt.ai_budget") as string);
  
    return {
        ai_name,
        ai_role,
        ai_goals: aiGoals,
        api_budget: parseFloat(apiBudgetInput) || 0
    }
  }
  
  function generateAIConfigAutomatic(userDesire: string): AIConfig {
    // TODO: Implement automatic generation based on userDesire
    throw new Error('TODO: Automatic generation not implemented');
  }
  
  async function promptUser(cfg: IRunParameters, t: TFunction): Promise<AIConfig> {
    const DEFAULT_USER_DESIRE_PROMPT = 'default-desire'; // Replace with the actual default prompt
  
    console.log(t("ai.welcome") );
  
    console.log(t("ai.welcome2"));
  
    let userDesire = await clean_input(cfg, t("prompt.user_desire") + " ");
  
    if (userDesire === '') {
      userDesire = DEFAULT_USER_DESIRE_PROMPT; // Default prompt
    }
  
    if (userDesire.includes('--manual')) {
      console.log(t("ai.manual_mode"));
      return generateAIConfigManual(cfg, t);
    } else {
      try {
        return generateAIConfigAutomatic(userDesire);
      } catch (error) {
        console.log( t("ai.manual_mode_fallback") );
        return generateAIConfigManual(cfg, t);
      }
    }
  }
  

export { AIConfig, loadAIConfig, saveAIConfig, constructFullPrompt, promptUser };
