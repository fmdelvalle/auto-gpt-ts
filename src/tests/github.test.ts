import axios from "axios";
import { buildTestAgent } from "../core/agent";
import * as fs from 'fs';
import * as git from 'isomorphic-git';
import * as http from 'isomorphic-git/http/node';
import { prepare_test_logger } from "core/logger";


describe('testGitHub', () => {
    // Run everything in a Promise
    // so we can use async/await syntax
    // and the test runner will wait for it
    // to resolve before exiting
    it('should clone small repo', async () => {
        const agent = await buildTestAgent(await prepare_test_logger());
        if( agent.config.github.api_key === undefined || agent.config.github.username === undefined ) {
            console.log("Github is not setup, not testing it");
            return;
        } else {
            try {
                await axios.get('https://github.com/rtyley/small-test-repo');
            } catch( e ) {
                if( axios.isAxiosError(e) ) {
                    console.log(e.response?.status);
                    if( e.response?.status === 401 || e.response?.status === 404 ) { 
                        console.log("Invalid repository URL");
                    }
                } else {
                    console.log("Unknown error");
                }
            }
            await fs.promises.mkdir('/tmp/testrepo2', { recursive: true });
            await git.clone({
                fs,
                http,
                url: 'https://github.com/rtyley/small-test-repo',
                dir: '/tmp/testrepo2',
                singleBranch: true,
                depth: 1,
              });
            await fs.promises.rm('/tmp/testrepo2', { recursive: true });
          
        }
    });

  });