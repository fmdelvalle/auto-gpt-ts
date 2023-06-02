import { ICommandArgs, IRunParameters } from '../types';
import { CommandRegistry, commandToString } from './command_registry';

type IPromptGeneratorCommand =  {
    label: string,
    name: string,
    args: Record<string,any>,
    function: CallableFunction
}

export interface IPromptGenerator {
  constraints: string[];
  commands: IPromptGeneratorCommand[];
  resources: string[];
  performance_evaluation: string[];
  goals: string[];
  name: string;
  role: string;
  response_format: {
    thoughts: {
      text: string;
      reasoning: string;
      plan: string;
      criticism: string;
      speak: string;
    };
    command: {
      name: string;
      args: { [key: string]: string };
    };
  };

  add_constraint(constraint: string): void;
  add_command(
    command_label: string,
    command_name: string,
    args?: ICommandArgs | null,
    func?: CallableFunction | null
  ): void;
  add_resource(resource: string): void;
  add_performance_evaluation(evaluation: string): void;
  generate_prompt_string(cfg: IRunParameters): string;
}

export class PromptGeneratorImpl implements IPromptGenerator {
  constraints: string[] = [];
  commands: IPromptGeneratorCommand[] = [];
  resources: string[] = [];
  performance_evaluation: string[] = [];
  goals: string[] = [];
  name: string = 'Bob';
  role: string = 'AI';
  response_format = {
    thoughts: {
      text: 'thought',
      reasoning: 'reasoning',
      plan: '- short bulleted\n- list that conveys\n- long-term plan',
      criticism: 'constructive self-criticism',
      speak: 'thoughts summary to say to user',
    },
    command: {
      name: 'command name',
      args: { 'arg name': 'value' },
    },
  };

  add_constraint(constraint: string): void {
    this.constraints.push(constraint);
  }

  add_command(
    command_label: string,
    command_name: string,
    args: ICommandArgs | null = null,
    func: CallableFunction
  ): void {
    const command: IPromptGeneratorCommand = {
      label: command_label,
      name: command_name,
      args: args || {},
      function: func,
    };

    this.commands.push(command);
  }

  _generate_command_string(cfg: IRunParameters, command: IPromptGeneratorCommand): string {
    const argsString = Object.entries(command.args)
      .map(([key, value]) => `"${key}": "${value}"`)
      .join(', ');
    return `${command.label}: "${command.name}", args: { ${argsString} }`;
  }

  add_resource(resource: string): void {
    this.resources.push(resource);
  }

  add_performance_evaluation(evaluation: string): void {
    this.performance_evaluation.push(evaluation);
  }

  _generate_numbered_list(cfg: IRunParameters, items: (IPromptGeneratorCommand|string)[], item_type = 'list'): string {
    if (item_type === 'command') {
      const commandStrings = cfg.command_registry
        ? Object.values(cfg.command_registry.commands)
            .filter((item) => item.enabled(cfg) )
            .map((item) => commandToString(item))
        : [];
      const commands = [...commandStrings, ...items].map(
        (item, index) => `${index + 1}. ${item}`
      );
      return commands.join('\n');
    } else {
      return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
    }
  }

  generate_prompt_string(cfg: IRunParameters): string {
    const formattedResponseFormat = JSON.stringify(
      this.response_format,
      null,
      4
    );
    return `Constraints:\n${this._generate_numbered_list(cfg, this.constraints)}\n\nCommands:\n${this._generate_numbered_list(cfg, 
      this.commands,
      'command'
    )}\n\nResources:\n${this._generate_numbered_list(cfg, 
      this.resources
    )}\n\nPerformance Evaluation:\n${this._generate_numbered_list(cfg, 
      this.performance_evaluation
    )}\n\nYou should only respond in JSON format as described below \nResponse Format: \n${formattedResponseFormat} \nEnsure the response can be parsed by Javascript JSON.parse`;
  }
}

export default PromptGeneratorImpl;
