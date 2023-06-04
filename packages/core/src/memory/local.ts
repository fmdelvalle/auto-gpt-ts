import * as np from 'numjs';
import * as fs from 'fs';
import { get_ada_embedding } from '../llm/llm_utils';
import { IAgent, IMemory, IRunParameters } from '../types';

const EMBED_DIM = 1536;

function create_default_embeddings(): np.NdArray {
  return np.zeros([0, EMBED_DIM], 'float32');
}

class CacheContent {
  texts: string[] = [];
  embeddings: np.NdArray = create_default_embeddings();
}

const argsort = (a: number[]) =>{
  return a.map((v,i)=>[v,i]).sort().map(i=>i[1]);
}

export async function LocalCache(cfg: IRunParameters): Promise<IMemory> {
  const workspacePath = cfg.workspace_directory;
  try{
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
      console.log(`Directory created: ${workspacePath}`);
    }
  } catch(e) {
    console.warn('Error creating directory', workspacePath, e);
  }
  const filename = `${workspacePath}/${cfg.memory.index}.json`;

  try {
    await fs.promises.writeFile(filename, '{}');
  } catch (e) {
    console.log('Error creating file', filename, e);
    throw(e);
  }

  const data: CacheContent = new CacheContent();

  const classname = 'LocalCache';

  async function add(text: string): Promise<string> {
    if (text.includes('Command Error:')) {
      return '';
    }

    data.texts.push(text);
    console.warn("TODO: convert text and save embedding in local file");
    return text;

/*    const embedding = await get_ada_embedding(cfg, text);

    const vector = np.array(embedding, 'float32');
    return text;
    */
    /*
    const newEmbeddings = np.concatenate([data.embeddings, vector.reshape(1, -1)], 0);
    data.embeddings = newEmbeddings;

    const SAVE_OPTIONS = np.OPT_SERIALIZE_NUMPY | np.OPT_SERIALIZE_DATACLASS;
    const out = np.serialize(data, SAVE_OPTIONS);
    await fs.writeFile(filename, out);

    return text;
    */
  }

  async function clear(): Promise<string> {
    data.texts = [];
    data.embeddings = create_default_embeddings();
    return 'Obliviated';
  }

  async function get( agent: IAgent, data: string): Promise<string[]> {
    return await get_relevant( agent, data, 1);
  }

  async function get_relevant( agent: IAgent, text: string, k: number): Promise<string[]> {
    const embedding = await get_ada_embedding(agent, text);

    const scores = np.dot(data.embeddings, embedding);

    const top_k_indices = argsort(scores.tolist()).slice(-k).reverse();

    return top_k_indices.map((i: number) => data.texts[i]);
  }

  function get_stats(): [number, number[]] {
    return [data.texts.length, data.embeddings.shape];
  }

  return { add, clear, get, get_relevant, get_stats, classname };
}

