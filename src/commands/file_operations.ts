import * as fs from "fs";
import * as path from "path";
import axios, { AxiosResponse } from "axios";
import { ICommand, ICommandContext, IRunParameters } from "types";
import Spinner from "../cli/spinner";
import * as crypto from 'crypto';

function text_checksum(text: string): string {
  const hash = crypto.createHash('md5');
  hash.update(text, 'utf-8');
  return hash.digest('hex');
}

interface DownloadFileOptions {
  url: string;
  filename: string;
}

function downloadFile(ctx: ICommandContext, options: DownloadFileOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const { url, filename } = options;
    const directory = path.dirname(filename);

    fs.mkdirSync(directory, { recursive: true });

    const message = `\x1b[33mDownloading file from \x1b[44m${url}\x1b[0m\x1b[0m`;
    const spinner = new Spinner(message);
    spinner.start();

    const writer = fs.createWriteStream(filename);
    let totalSize = 0;
    let downloadedSize = 0;

    axios
      .get(url, { responseType: "stream" })
      .then((response: AxiosResponse) => {
        const contentLength = response.headers["content-length"];
        totalSize = contentLength ? parseInt(contentLength) : 0;

        response.data.on("data", (chunk: Buffer) => {
          downloadedSize += chunk.length;
          writer.write(chunk);

          const progress = `${readableFileSize(downloadedSize)} / ${readableFileSize(totalSize)}`;
          spinner.updateMessage(`${message} ${progress}`);
        });

        response.data.on("end", () => {
          writer.end();
          spinner.stop();

          resolve(`Successfully downloaded and locally stored file: "${filename}"! (Size: ${readableFileSize(downloadedSize)})`);
        });
      })
      .catch((error: Error) => {
        spinner.stop();
        reject(`Error: ${error.message}`);
      });
  });
}

const download_file_command: ICommand =     {
    name: "download_file",
    description: "Download a file from a URL and store it locally",
    method: downloadFile,
    signature: "<url> <filename>",
    categories: ['file_operations'],
    enabled: (cfg: IRunParameters) => cfg.allow_downloads !== false,
    returns: 'A string indicating success or failure'
};

    

function readableFileSize(size: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }
  return `${Math.round(size)} ${units[index]}`;
}

const list_files_command: ICommand = {
        name: "list_files",
        description: "List files in a directory",
        signature: "<directory> <recursive>",
        categories: ['file_operations'],
        enabled: () => true,
        returns: 'A list of files',
        method: async (ctx: ICommandContext, { directory, recursive }: { directory: string, recursive: boolean }): Promise<string[]> => {
            const foundFiles: string[] = [];

            const processDirectory = async (currentDir: string) => {
                const files = await fs.promises.readdir(currentDir);

                for (const file of files) {
                    const filePath = path.join(currentDir, file);
                    const relativePath = path.relative(directory, filePath);

                    try {
                        const stats = await fs.promises.stat(filePath);

                        if (stats.isDirectory() && recursive) {
                            await processDirectory(filePath);
                        } else if (!file.startsWith('.')) {
                            foundFiles.push(relativePath);
                        }
                    } catch (error) {
                        console.log(`Error checking file ${filePath}: `, (error as Error).message);
                    }
                }
            };
            await processDirectory(directory);

            return foundFiles;
        }
    };

const append_to_file_command: ICommand = {
    name: "append_to_file",
    description: "Append to file",
    method: async (ctx: ICommandContext, {filename, text} : {filename: string, text: string}, should_log?: boolean): Promise<string> => {
        try {
            const directory = path.dirname(filename);
            await fs.promises.mkdir(directory, { recursive: true });
            await fs.promises.appendFile(filename, text, { encoding: 'utf-8' });

            if (should_log === true) {
                const fileContent = await fs.promises.readFile(filename, 'utf-8');
                const checksum = text_checksum(fileContent);
                ctx.agent.logger.log_operation('append', filename, { checksum });
            }

            return 'Text appended successfully.';
        } catch (err) {
            return `Error: ${err}`;
        }
    },
    signature: "<filename> <text>",
    categories: ['file_operations'],
    enabled: () => true,
    returns: 'A string indicating success or failure'
}

const write_to_file_command: ICommand = {
    name: "write_to_file",
    description: "Write to file",
    method: async (ctx: ICommandContext, {filename, text} : {filename: string, text: string}): Promise<string> => {
        const checksum = text_checksum(text);
        if (ctx.agent.logger.is_duplicate_operation('write', filename, { checksum } )) {
            return 'Error: File has already been updated.';
        }
        try {
            const directory = path.dirname(filename);
            await fs.promises.mkdir(directory, { recursive: true });
            await fs.promises.writeFile(filename, text, { encoding: 'utf-8' });
            ctx.agent.logger.log_operation('write', filename, { checksum });
            return 'File written to successfully.';
        } catch (err) {
            return `Error: ${err}`;
        }
    },
    signature: "<filename> <text>",
    categories: ['file_operations'],
    enabled: () => true,
    returns: 'A string indicating success or failure'
}

const read_file_command: ICommand = {
    name: "read_file",
    description: "Read file",
    method: async (ctx: ICommandContext, {filename} : {filename: string}): Promise<string> => {
        try {
            const buffer = await fs.promises.readFile(filename);
            // Get string from Buffer
            const contents = buffer.toString();
            return contents.normalize();
          } catch (err) {
            return `Error: ${err}`;
          }
        },
    signature: "<filename>",
    categories: ['file_operations'],
    enabled: () => true,
    returns: 'The file contents'
}

const delete_file_command: ICommand = {
    name: "delete_file",
    description: "Delete file",
    method: async (ctx: ICommandContext, {filename} : {filename: string}): Promise<string> => {
        if (ctx.agent.logger.is_duplicate_operation('delete', filename )) {
            return 'Error: File has already been deleted.';
        }
        try {
            await fs.promises.rm(filename, { force: true  });
            ctx.agent.logger.log_operation('delete', filename);
            return 'File deleted successfully.';
        } catch (err) {
            return `Error: ${err}`;
        }
        
    },
    signature: "<filename>",
    categories: ['file_operations'],
    enabled: () => true,
    returns: 'A string indicating success or failure'
}
      
const commands : ICommand[] = [
    download_file_command,
    list_files_command,
    append_to_file_command,
    write_to_file_command,
    read_file_command,
    delete_file_command
]

export default commands;