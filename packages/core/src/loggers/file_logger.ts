import * as fs from 'fs';
import { ILogger } from "../types";

/**
 * This logger just appends messages to a file (log.txt)
 */
export default class FileLogger implements Partial<ILogger> {
    private filePath: string;
  
    constructor(filePath: string) {
      this.filePath = filePath;
    }

    typewriter_log (header: string, color?: string, text?: string, x?: boolean) {
        this.writeToFile( `${header} ${text}` );
    }
    info (text: string) {
        this.writeToFile( `[INFO] ${text}` );
    }
    debug (text: string, extra?: string|number) {
        this.writeToFile(`[DEBUG] ${text} ${extra}`.trim());
    }
    warn (text: string) {
        this.writeToFile(`[WARN] ${text}`);
    }
    error (text: string, extra?: string|number) {
        this.writeToFile(`[ERROR] ${text} ${extra}`.trim());
    }
    private writeToFile(log: string): void {
      // Write the log message to the file
      // You need to implement the file writing logic here
      // using file system APIs or a logging library
      // Example: fs.appendFile(this.filePath, log + '\n');
      fs.appendFileSync(this.filePath, log + '\n');
    }
}

