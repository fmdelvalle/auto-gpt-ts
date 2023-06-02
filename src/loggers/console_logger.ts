import { Fore } from "./functions";
import { ILogger } from "types";

const typewriter_log = (header: string, color?: string, text?: string|number, x?: boolean) => {
    if( text ) {        
        console.log(`${color}${header}: ${text}` + Fore.RESET);
    } else {
        console.log(`${color}${header}` + Fore.RESET);
    }
};

/**
 * This logger just prints out to the console
 */

export default class ConsoleLogger implements Partial<ILogger> {
    typewriter_log (header: string, color?: string, text?: string, x?: boolean) {
        typewriter_log( header, color, text, x );
    }
    info (text: string) {
        typewriter_log( text, Fore.LIGHTBLUE_EX );
    }
    debug (text: string, extra?: string|number) {
        typewriter_log( text, Fore.MAGENTA, extra );
    }
    warn (text: string) {
        typewriter_log( text, Fore.YELLOW );
    }
    error (text: string, extra?: string|number) {
        extra ? console.error(text, extra) : console.error(text);
    }
}
