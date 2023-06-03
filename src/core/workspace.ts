import * as path from 'path';
import * as fs from 'fs';
import { ILogger } from '../types';

class Workspace {
  /**
   * A class that represents a workspace for an AutoGPT agent.
   */

  private static NULL_BYTES = ["\0", /*"\000", */ "\x00" , "\z", "\u0000", "%00"];

  private _root: string ;
  private _restrict_to_workspace: boolean;
  private _logger: ILogger;

  constructor(workspace_root: string , restrict_to_workspace: boolean, logger: ILogger) {
    this._root = this._sanitizePath(workspace_root);
    this._restrict_to_workspace = restrict_to_workspace;
    this._logger = logger;
  }

  get root(): string  {
    /**
     * The root directory of the workspace.
     */
    return this._root;
  }

  get restrict_to_workspace(): boolean {
    /**
     * Whether to restrict generated paths to the workspace.
     */
    return this._restrict_to_workspace;
  }

  makeWorkspace(workspace_directory: string , ...args: any[]): string  {
    /**
     * Create a workspace directory and return the path to it.
     *
     * Parameters
     * ----------
     * workspace_directory
     *     The path to the workspace directory.
     *
     * Returns
     * -------
     * string 
     *     The path to the workspace directory.
     */
    workspace_directory = this._sanitizePath(workspace_directory);
    fs.mkdirSync(workspace_directory, { recursive: true });
    return workspace_directory;
  }

  get_path(relative_path: string ): string  {
    /**
     * Get the full path for an item in the workspace.
     *
     * Parameters
     * ----------
     * relative_path
     *     The relative path to resolve in the workspace.
     *
     * Returns
     * -------
     * string 
     *     The resolved path relative to the workspace.
     */
    return this._sanitizePath(relative_path, this.root, this.restrict_to_workspace);
  }

  private _sanitizePath(relative_path: string , root?: string , restrict_to_root: boolean = true): string  {
    /**
     * Resolve the relative path within the given root if possible.
     *
     * Parameters
     * ----------
     * relative_path
     *     The relative path to resolve.
     * root
     *     The root path to resolve the relative path within.
     * restrict_to_root
     *     Whether to restrict the path to the root.
     *
     * Returns
     * -------
     * string 
     *     The resolved path.
     *
     * Throws
     * ------
     * Error
     *     If the path is absolute and a root is provided.
     * Error
     *     If the path is outside the root and the root is restricted.
     */

    // Posix systems disallow null bytes in paths. Windows is agnostic about it.
    // Do an explicit check here for all sorts of null byte representations.

    for (const nullByte of Workspace.NULL_BYTES) {
      if (relative_path.includes(nullByte) || (root && root.toString().includes(nullByte))) {
        throw new Error("embedded null byte in " + relative_path);
      }
    }

    if (!root) {
      return path.resolve(relative_path.toString());
    }

    this._logger.debug(`Resolving path '${relative_path}' in workspace '${root}'`);

    root = path.resolve(root.toString());

    this._logger.debug(`Resolved root as '${root}'`);

    if (path.isAbsolute(relative_path)) {
      throw new Error(`Attempted to access absolute path '${relative_path}' in workspace '${root}'.`);
    }

    const full_path = path.resolve(root, relative_path);

    this._logger.debug(`Joined paths as '${full_path}'`);

    if (restrict_to_root && !path.relative(root, full_path)) {
      throw new Error(`Attempted to access path '${full_path}' outside of workspace '${root}'.`);
    }

    return full_path;
  }
}

export { Workspace };
