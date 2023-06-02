import * as fs from "fs";
import axios from "axios";
import { Env, IRunParameters } from "../types";
import readline from 'readline';
import { TFunction } from "i18next";
/**
 * TODO: make it point to our own bulletin
 */
async function getBulletinFromWeb( language: string ): Promise<string> {
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
export default async function getLatestBulletin( language: string, t: TFunction ): Promise<[string, boolean]> {
    const newBulletin = await getBulletinFromWeb( language );
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
    if ( cfg.chat_plugin_settings.chat_messages_enabled ) {
      for (const plugin of cfg.plugins) {
        if (typeof plugin.can_handle_user_input !== 'function') {
          continue;
        }
        if (!plugin.can_handle_user_input({ user_input: prompt })) {
          continue;
        }
        const plugin_response = plugin.user_input({ user_input: prompt });
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

export { clean_input };
