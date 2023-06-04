import { program } from '@commander-js/extra-typings';
import { ICliArguments } from '@auto-gpt-ts/core';
import { run_auto_gpt, loadEnv } from '@auto-gpt-ts/core';
import ConsoleLogger from '../loggers/console_logger';


export function runCli() {
  const env = loadEnv();
  console.log(env);

  program
    .option('-c, --continuous', 'Enable Continuous Mode', false)
    .option('-y, --skip-reprompt', 'Skips the re-prompting messages at the beginning of the script')
    .option('-C, --ai-settings <file>', 'Specifies which ai_settings.yaml file to use, will also automatically skip the re-prompt.')
    .option('-l, --continuous-limit <limit>', 'Defines the number of times to run in continuous mode')
    .option('--speak', 'Enable Speak Mode')
    .option('--debug', 'Enable Debug Mode')
    .option('--gpt3only', 'Enable GPT3.5 Only Mode')
    .option('--gpt4only', 'Enable GPT4 Only Mode')
    .option('-m, --use-memory <type>', 'Defines which Memory backend to use')
    .option('--browser-name <name>', 'Specifies which web-browser to use when using selenium to scrape the web.')
    .option('--allow-downloads', 'Dangerous: Allows Auto-GPT to download files natively.')
    .option('--skip-news', 'Specifies whether to suppress the output of the latest news on startup.')
    .option('-w, --workspace-directory <directory>', 'Specifies the workspace directory.')
    .option('--install-plugin-deps', 'Installs external dependencies for 3rd party plugins.')
    .action(async (cmd: ICliArguments) => {

      // TODO: support for cli subcommands, or at least warn if one subcommand is passed
      // TODO: reconnect logger with spinner, in fact console logger should be ours
      await run_auto_gpt(cmd, env, [ new ConsoleLogger()]);
    });

    

  program.parse();
}