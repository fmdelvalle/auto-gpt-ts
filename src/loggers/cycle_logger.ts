import { ILogger } from "types";
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_PREFIX = 'agent';
const FULL_MESSAGE_HISTORY_FILE_NAME = 'full_message_history.json';
const CURRENT_CONTEXT_FILE_NAME = 'current_context.json';
const NEXT_ACTION_FILE_NAME = 'next_action.json';
const PROMPT_SUMMARY_FILE_NAME = 'prompt_summary.json';
const SUMMARY_FILE_NAME = 'summary.txt';
const USER_INPUT_FILE_NAME = 'user_input.txt';

class LogCycleHandler {
  /**
   * A class for logging cycle data.
   */

  public log_count_within_cycle: number;

  private log_directory: string;

  constructor(log_directory: string) {
    this.log_count_within_cycle = 0;
    this.log_directory = log_directory;
  }

  private createDirectoryIfNotExists(directoryPath: string): void {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
  }

  private createOuterDirectory(aiName: string, createdAt: string): string {

    let outerFolderName: string;
    if (process.env.OVERWRITE_DEBUG === '1') {
      outerFolderName = 'auto_gpt';
    } else {
      const aiNameShort = aiName.slice(0, 15) || DEFAULT_PREFIX;
      outerFolderName = `${createdAt}_${aiNameShort}`;
    }

    const outerFolderPath = path.join(this.log_directory, 'DEBUG', outerFolderName);
    this.createDirectoryIfNotExists(outerFolderPath);

    return outerFolderPath;
  }

  private createInnerDirectory(outerFolderPath: string, cycleCount: number): string {
    const nestedFolderName = cycleCount.toString().padStart(3, '0');
    const nestedFolderPath = path.join(outerFolderPath, nestedFolderName);
    this.createDirectoryIfNotExists(nestedFolderPath);

    return nestedFolderPath;
  }

  private createNestedDirectory(base_directory: string, cycleCount: number, cycle_name: string ): string {
    const outerFolderPath = this.createOuterDirectory(base_directory, cycleCount + "_" + cycle_name);
//    const nestedFolderPath = this.createInnerDirectory(outerFolderPath, cycleCount);

    return outerFolderPath;
  }

  public log_cycle(
    base_directory: string,
    cycleCount: number,
    cycleName: string,
    data: Record<string, any> | any,
    fileName: string
  ): void {
    const nestedFolderPath = this.createNestedDirectory(base_directory, cycleCount, cycleName);

    const jsonData = JSON.stringify(data, null, 4);
    const logFilePath = path.join(nestedFolderPath, `${this.log_count_within_cycle}_${fileName}`);

    fs.writeFileSync(logFilePath, jsonData, { encoding: 'utf-8' });
    this.log_count_within_cycle += 1;
  }
}

export {  DEFAULT_PREFIX, FULL_MESSAGE_HISTORY_FILE_NAME, CURRENT_CONTEXT_FILE_NAME, NEXT_ACTION_FILE_NAME, PROMPT_SUMMARY_FILE_NAME, SUMMARY_FILE_NAME, USER_INPUT_FILE_NAME };


export default class CycleLogger implements Partial<ILogger> {
    private base_directory: string;
    private log_cycle_handler?: LogCycleHandler;
    private log_cycle_index = 0;
    private log_cycle_name = '';
  
    constructor(base_directory: string) {
      this.base_directory = base_directory;
      this.log_cycle_handler = new LogCycleHandler( base_directory );
    }

    start_cycle (index: number, name: string) {
        this.log_cycle_index = index;
        this.log_cycle_name = name;
    }

    log_in_cycle_file (data: string | Record<string, any>, filename: string) {
        this.log_cycle_handler?.log_cycle( this.base_directory, this.log_cycle_index, this.log_cycle_name, data, filename );
    }

}
