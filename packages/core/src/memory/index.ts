import { ILogger, IMemory, IRunParameters } from "../types";
import { LocalCache } from "./local";

async function getMemory( cfg: IRunParameters, logger: ILogger, init: boolean = false ) : Promise<IMemory> {
    if( cfg.memory.backend == 'milvus') {
        throw new Error("Milvus memory backend not yet implemented");
    } else if( cfg.memory.backend == 'redis') {
        throw new Error("Redis memory backend not yet implemented");
    } else if( cfg.memory.backend == 'pinecone') {
        throw new Error("Pinecone memory backend not yet implemented");
    } else {    // local
        return await LocalCache(cfg);
    }   
}

export { getMemory };