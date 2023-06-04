import axios from 'axios';
import * as fs from 'fs';
import * as git from 'isomorphic-git';
import * as http from 'isomorphic-git/http/node';
import { ICommand, ICommandContext, IRunParameters } from '../types';


async function clone_repository(ctx: ICommandContext, {repository_url, clone_path}: { repository_url: string, clone_path: string}): Promise<string> {
  try {
    // Test that the repo exists
    try {
      await axios.get(repository_url);
    } catch( e ) {
        if( axios.isAxiosError(e) ) {
            if( e.response?.status === 401 || e.response?.status === 404 ) { 
                return "Error: This repository does not exist";
            }
        } 
        return ("Error: " + (e as Error).message);
    }

    await fs.promises.mkdir(clone_path, { recursive: true });
    await git.clone({
      fs,
      http,
      url: repository_url,
      dir: clone_path,
      singleBranch: true,
      depth: 1,
    });
    return `Cloned ${repository_url} to ${clone_path}, project root at ${clone_path}`;
  } catch (err) {
    return `Error: ${err}`;
  }
}


const clone_repository_command : ICommand = {
    name: 'clone_repository',
    description: 'Clone a repository',
    method: clone_repository,
    signature: '<repository_url> <clone_path>',
    enabled: (cfg: IRunParameters) => {
        return cfg.github.username !== undefined && cfg.github.api_key !== undefined;
    },
    categories: ['git_operations'],
    returns: 'Confirmation or error'
}

export default [
    clone_repository_command
];
