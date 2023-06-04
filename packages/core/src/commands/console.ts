/**
 * 
 * @param text The text to log to the console.
 * @returns boolean
 */

import { ICommand, ICommandContext } from "../types";


function log( ctx: ICommandContext, {text} : {text: string} ) : Promise<string> {
    if( text === undefined ) {
        return Promise.reject("The argument 'text' is required.");
    }
    console.log(">>> " +text);
    return Promise.resolve("The text has been logged to the console.");
}

const _commands : ICommand[] = [
    {
        name: 'console.log',
        description: 'Log text to the console.',
        method: log,
        signature: '<text>',
        enabled: () => true,
        categories: ['console'],
        returns: 'Nothing'
    },
    {
        name: 'stop',
        description: 'Stop the bot.',
        method: () => {
            process.exit(0);
        },
        signature: '',
        enabled: () => true,
        categories: [],
        returns: 'Nothing'
    }
]

export default _commands;