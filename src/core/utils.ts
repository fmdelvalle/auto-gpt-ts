import * as fs from "fs";
import axios from "axios";
import { Env, ILogger, IPlugin, IRunParameters } from "../types";
import readline from 'readline';
import { TFunction } from "i18next";
import path from "path";
/**
 * TODO: make it point to our own bulletin
 */
async function getBulletinFromWeb(language: string): Promise<string> {
  try {
    const response = await axios.get(
      "https://raw.githubusercontent.com/fmdelvalle/auto-gpt-ts/master/BULLETIN." + language + ".md"
    );
    if (response.status === 200) {
      return response.data;
    }
  } catch (error) {
    // Handle request errors if needed
  }

  return "";
}

/**
 * Warning: this function is blocking, rewrite it to be async
 */
export default async function getLatestBulletin(language: string, t: TFunction): Promise<[string, boolean]> {
  const newBulletin = await getBulletinFromWeb(language);
  let currentBulletin = "";
  try {
    currentBulletin = fs.readFileSync("data/CURRENT_BULLETIN." + language + ".md", "utf-8");
  } catch (error) {
    console.log(t("bulletin_creating"));
  }
  const isNewNews = newBulletin !== "" && newBulletin !== currentBulletin;

  let newsHeader = "\x1b[33m" + t("welcome") + "\n";
  if (newBulletin || currentBulletin) {
    newsHeader += t("welcome1") + "\n" + t("welcome2") + "\n";
  }

  if (newBulletin && isNewNews) {
    fs.writeFileSync("data/CURRENT_BULLETIN." + language + ".md", newBulletin, "utf-8");
    currentBulletin = `\x1b[31m::NEW BULLETIN::\x1b[0m\n\n${newBulletin}`;
  }

  return [`${newsHeader}\n${currentBulletin}`, isNewNews];
}

export function markdownToAnsiStyle(markdown: string): string {
  const ansiLines: string[] = [];

  for (const line of markdown.split("\n")) {
    let lineStyle = "";
    let line2 = markdown;

    if (line.startsWith("# ")) {
      lineStyle += "\u001b[1m"; // Bold
    } else {
      line2 = line.replace(
        /(?<!\*)\*(\*?[^*]+\*?)\*(?!\*)/g,
        "\u001b[1m$1\u001b[22m" // Bold start and end
      );
    }

    if (/^#+ /.test(line)) {
      lineStyle += "\u001b[36m"; // Cyan
      line2 = line.replace(/^#+ /, "");
    }

    ansiLines.push(`${lineStyle}${line2}\u001b[0m`); // Reset style
  }

  return ansiLines.join("\n");
}


async function clean_input(cfg: IRunParameters, prompt: string = "", talk: boolean = false): Promise<string> {
  try {
    // Plugins can impersonate the user and provide input. The first plugin to provide input will be used.
    if (cfg.chat_plugin_settings.chat_messages_enabled) {
      for (const plugin of cfg.plugins) {
        if (!plugin.provide_user_input) {
          continue;
        }
        const plugin_response = plugin.provide_user_input({ user_input: prompt });
        if (!plugin_response) {
          continue;
        }
        const lowerResponse = plugin_response.toLowerCase();
        if (
          [
            "yes",
            "yeah",
            "y",
            "ok",
            "okay",
            "sure",
            "alright",
          ].includes(lowerResponse)
        ) {
          return cfg.options.authorise_command_key;
        } else if (["no", "nope", "n", "negative"].includes(lowerResponse)) {
          return cfg.options.exit_key;
        }
        return plugin_response;
      }
    }

    // ask for input, default when just pressing Enter is y
    //console.log("Asking user via keyboard...");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(prompt.trim() + " ", (answer: string) => {
        rl.close();
        resolve(answer);
      });
    });
  } catch (error) {
    console.log("You interrupted Auto-GPT");
    console.log("Quitting...");
    process.exit(0);
  }
}

async function load_all_plugins(logger: ILogger, t: TFunction) {
    // Load all plugins. Some may be disabled by the user, but we will be filtering them out later
    // We need to check all directories in the ../plugins directory, and load all plugins from them, using fs
    const plugin_directory = path.resolve(__dirname, '../plugins');
    const subdirectories = await fs.promises.readdir(plugin_directory, { withFileTypes: true });
    const all_plugins: IPlugin[] = [];
    for (const subdirectory of subdirectories) {
        if (subdirectory.isDirectory()) {
            try {
                const module = await import(path.resolve( plugin_directory, subdirectory.name, 'index.ts'));
                const plugin = new module.default() as IPlugin;
                if (plugin) {
                    logger.info(t("plugin.loaded", { classname:  plugin.classname } ) );
                    all_plugins.push(plugin);
                }
            } catch (e) {
                console.error("Failed to load plugin from directory: " + subdirectory.name);
                console.error(e);
            }
        }
    }
    return all_plugins;
}

export { clean_input, load_all_plugins };

