import { customsearch } from '@googleapis/customsearch';
import { Env, ICommand, ICommandContext } from '../types';
import { truncate_text } from '../processing/text';

let google_api: string|null= null;
let custom_search_engine_id :string|null= null;


export async function init( env: Env) {
    google_api = env.google.api_key || null;
    custom_search_engine_id = env.google.custom_search_engine_id || null;
}

type IGoogleItem = {
  link?: string|null,
  title?: string|null,
  htmlTitle?: string|null,
  snippet?: string|null,
}

async function google_official_search(ctx: ICommandContext, {query, num_results= 8} : {query: string, num_results?: number }): Promise<string | string[]> {
  try {
    if( !google_api || !custom_search_engine_id ) {
        throw new Error("Google API key not set");
    }
    console.log("Searching in Google", query, num_results);

    // Initialize the Custom Search API service
    const service = customsearch('v1');
    const req = {
      auth: google_api,
      cx: custom_search_engine_id || undefined,
      q: query,
      num: num_results,
    };
    console.log("Request", req);
    const result = await service.cse.list(req);

    // Extract the search result items from the response
    const search_results = result.data.items || [];
    //console.log("Result", result.data.items );

    // Create a list of only the URLs from the search results
    // const search_results_links = search_results.map((item: IGoogleItem) => item.link);

    // Return the list of search result URLs
    return `Search results for \"${query}\"\n` + safe_google_results(search_results);
  } catch (error: any) {
    if (error.response?.data?.error?.message?.includes('invalid API key')) {
      return 'Error: The provided Google API key is invalid or missing.';
    } else {
      return `Error: ${error}`;
    }
  }
}

function safe_google_results(results: IGoogleItem[]): string {
    console.log("safe_google_results", results );
    const as_json = results.map((result) => {
      return {
        link: result.link?.toString().replace(/[^\x00-\x7F]/g, ''),
        title: truncate_text( result.title?.toString().replace(/[^\x00-\x7F]/g, '') || 'Untitled', 10 ),
      };
    });
    const as_text = results.map((result) => {
      return "- Link: " + result.link?.toString().replace(/[^\x00-\x7F]/g, '') + " --- Title: " 
        + truncate_text( result.title?.toString().replace(/[^\x00-\x7F]/g, '') || 'Untitled', 10 );
    }).join("\n");
    return as_text.length > 0 ? as_text : "No results";
    return JSON.stringify(as_json);
//    const safe_message = JSON.stringify(results.map((result) => result.link?.toString().replace(/[^\x00-\x7F]/g, '')));
//    return safe_message;
}

const _commands : ICommand[] = [
    {
        name: 'google',
        description: 'Search in Google and get hyperlinks.',
        method: google_official_search,
        signature: '<query> <num_results>',
        enabled: () => (google_api && custom_search_engine_id) ? true : false,
        categories: ['google_search'],
        returns: 'A list of hyperlinks'
    },
]


export default _commands;