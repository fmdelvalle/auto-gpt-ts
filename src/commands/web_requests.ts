import axios from 'axios';
import cheerio, { load } from 'cheerio';
import { extract_hyperlinks, format_hyperlinks } from '../processing/html';
import { ICommand, ICommandContext } from 'types';
import { summarize_text } from '../processing/text';

type IResponseResult = {
    response: string|null,
    error: string|null
}


async function get_response(
  url: string,
  timeout: number = 10000
): Promise<IResponseResult> {

    // TODO: validate URL (check @validate_url)

    const session = axios.create({});
    try { 

        const response = await session.get(url, { timeout });
        // Check if the response contains an HTTP error
        if (response.status >= 400) {
            return {response: null,  error: `Error: HTTP ${response.status} error` };
        }
        const contents = await response.data;
        return {response: contents, error: null};
    } catch (error) {
        if (error instanceof axios.AxiosError) {
            // Handle exceptions related to the HTTP request
            // (e.g., connection errors, timeouts, etc.)
            return {response: null, error: `Error getting ${url}: ${error.message}`};
        } else {
            throw error;
        }
    }
}

async function scrape_text(url: string): Promise<string> {
    const {response, error} = await get_response(url);
    if (error) {
        return error;
    }
    if (!response) {
        return "Error: Could not get response";
    }
    const $ = load(response);

    $("script, style").remove();

    let text = $.text();
    const lines = text.split("\n").map((line) => line.trim());
    const chunks = lines.flatMap((line) => line.split(/\s{2,}/).map((phrase) => phrase.trim()));
    text = chunks.filter((chunk) => chunk).join("\n");

    return text;
}

async function scrape_links(ctx: ICommandContext, {url}: {url: string}): Promise<string | string[]> {
    const {response, error} = await get_response(url);
    if (error) {
        return error;
    }
    if (!response) {
        return "Error: Could not get response";
    }

    const $ = load(response);

    $("script, style").remove();

    const hyperlinks = extract_hyperlinks($, url);

    return format_hyperlinks(hyperlinks);
}

export async function get_text_summary(ctx: ICommandContext, {url,question}: {url: string, question: string}): Promise<string> {
    const text = await scrape_text(url);
    const summary = await summarize_text(ctx, url, text, question);
    return `\" \"Result\" : ${summary} \"`;
}

// Only used by tests in AutoGPT
function create_message(chunk: string, question: string): any {
  return {
    "role": "user",
    "content": `"""\${chunk}""" Using the above text, answer the following` +
      ` question: "\${question}" -- if the question cannot be answered using the` +
      " text, summarize the text."
  };
}

const commands : ICommand[] = [
    {
        name: "extract_hyperlinks",
        description: "Get hyperlinks from a URL",
        method: scrape_links,
        signature: "<url>",
        categories: ['core'],
        enabled: () => true,
        returns: 'A list of hyperlinks'
    },
    {
        name: "get_text_summary",
        description: "Get text summary from a URL",
        method: get_text_summary,
        signature: "<url> <question>",
        categories: ['core'],
        enabled: () => true,
        returns: 'A text summary'
    }
]

export default commands;
