import { Callable, Env, IAgent, ICommand, ICommandArgs, ICommandCategory, ICommandContext, ILogger, IPlugin } from '../types';

import path from 'path';
import * as fs from 'fs';
import { TFunction } from 'i18next';

export function commandToString(c: ICommand ) {
    return `${c.name}: ${c.description}, args: ${c.signature}`;
}

export class CommandRegistry {
  public commands: Record<string, ICommand>;

  constructor() {
    this.commands = {};
  }
/*
  private _import_module(module_name: string): any {
    //return importlib.import_module(module_name);
  }

  private _reload_module(module: any): any {
    //return importlib.reload(module);
  }
  */

  register(cmd: ICommand): void {
    this.commands[cmd.name] = cmd;
  }

  unregister(command_name: string): void {
    if (command_name in this.commands) {
      delete this.commands[command_name];
    } else {
      throw new Error(`Command '${command_name}' not found in registry.`);
    }
  }

  reload_commands(): void {
    console.warn("Reloading unsupported");
    /*
    for (const cmd_name in this.commands) {
      const cmd = this.commands[cmd_name];
      const module = this._import_module(cmd.method.__module__);
      const reloaded_module = this._reload_module(module);
      if (reloaded_module.register) {
        reloaded_module.register(this);
      }
    }*/
  }

  get_command(name: string): Callable {
    return this.commands[name].method;
  }
/*
  call(agent: IAgent, command_name: string, kwargs: Record<string, any>): any {
    if (!(command_name in this.commands)) {
      throw new Error(`Command '${command_name}' not found in registry.`);
    }
    const command = this.commands[command_name];
    const context : ICommandContext = {
      agent: agent,
      ...agent.config,
    }
    return command.method(context, kwargs);
  }
*/
  command_prompt(): string {
    const commands_list = Object.values(this.commands)
      .map((cmd, idx) => `${idx + 1}. ${cmd.name}: ${cmd.description}, args: ${cmd.signature}`);
    return commands_list.join('\n');
  }

  async import_all_commands(env: Env, t: TFunction): Promise<void> {
    const files = fs.readdirSync(path.join(__dirname, '../commands'), {recursive: true});
    for( const file of files) {
      let str = `${file}`;
      // When loading in a library, there are other files that are not code
      if( str.includes('.d.') || str.endsWith('.map') ) {
        continue;
      }
      let file_name = str; // `${file}`.replace(/\.[^/.]+$/, "");
      if( file_name.includes('functions') || file_name.includes('index') ) {
        continue;
      }
//      console.log("File found: " + file);
//      console.log("Importing command: ", file_name);
      const module = await import(`../commands/${file_name}`);
      try {
        if( module['init']) {
          await module['init'](env)
        }
        if( module['default'] ) {
          const commands = module['default'] as ICommand[];
          commands.forEach( cmd => {
            if( cmd.categories.find( c => env.denylisted_plugins?.includes( c ) ) ) {
              console.log("Skipping command: ", cmd.name);
            } else {
//              console.log(t("registry.file_command", { file, name: cmd.name }));
              this.register(cmd)
            }
          });
//          console.log("Module loaded: ", file, commands.length);
        } else {
          console.log("Module not loaded or empty: ", file);
        }
      } catch (e: any) {
        console.error("Failed to import module: ", file, e.message);
      }
    }
  }

  async add_plugin_commands(logger: ILogger, t: TFunction, plugins: IPlugin[] ): Promise<void> {
    for( const plugin of plugins ) {
      if( plugin.on_add_commands ) {
        for( const command of plugin.on_add_commands() ) {
          this.register(command);
          logger.info(t("plugin.added_command", { classname: plugin.classname, command_name: command.name }))
        }
      }
    }
  }

  async import_commands(env: Env, module_name: ICommandCategory): Promise<void> {
    try {
      const module = await import(`../commands/${module_name}`);
//      console.log("Loading module: ", module_name);
      if( module['init']) {
        await module['init'](env)
      }
      if( module['default'] ) {
        const commands = module['default'] as ICommand[];
        commands.forEach( cmd => this.register(cmd) );
      } else {
        console.log("Module not loaded or empty: ", module_name);
      }
    } catch (e: any) {
      console.error("Failed to import module: ", module_name, e.message);
    }
    return;
  }
}

export function get_command_from_response(response_json: object): [string|'Error', ICommandArgs] {
    try {
        if (!("command" in response_json)) {
            return ["Error", { description: "Missing 'command' object in JSON" }];
        }

        if (typeof response_json !== "object" || Array.isArray(response_json)) {
            return ["Error", { description: `'response_json' object is not a dictionary: ${response_json}` }];
        }

        const command = response_json["command"];
        if (typeof command !== "object" || Array.isArray(command)) {
            return ["Error", { description: "'command' object is not a dictionary" }];
        }
        if( !command) {
          return ["Error", { description: "'command' object is null" }];
        }

        if (!("name" in command)) {
            return ["Error", { description: "Missing 'name' field in 'command' object" }];
        }

        const command_name = command["name"] as string;

        // Use an empty dictionary if 'args' field is not present in 'command' object
        let args: ICommandArgs = {};
        if( "args" in command ) {
          args = command["args"] as ICommandArgs;
        }

        return [command_name, args];
    } catch (error) {
        if (error instanceof SyntaxError) {
            return ["Error", { description: "Invalid JSON" }];
        } else {
            return ["Error", {description: JSON.stringify(error) }];
        }
    }
}
