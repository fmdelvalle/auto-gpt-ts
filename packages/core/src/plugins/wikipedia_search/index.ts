import { _wikipedia_search } from './wikipedia_search';
import { ICommand, ICommandContext, IPlugin } from '../../types';


class WikipediaSearchPlugin implements IPlugin {
    _name: string;
    _version: string;
    _description: string;
    classname: string;

    constructor() {
        this.classname = "WikipediaSearchPlugin";
        this._name = "autogpt-ts-wikipedia-search";
        this._version = "0.1.0";
        this._description = "Wikipedia search integrations.";
    }

    on_add_commands(): ICommand[] {
        return [{
            name: 'wikipedia_search',
            description: 'Wikipedia search',
            signature: '<query>',
            enabled: () => true,
            categories: ['internet_search'],
            method: this.call_method,
            returns: 'JSON with the search results'
        }] as ICommand[];
    }

    async call_method(ctx: ICommandContext, { query }: { query: string }) {
        return await _wikipedia_search(ctx.agent.config.language, query, 10);
    }

}

export default WikipediaSearchPlugin;
