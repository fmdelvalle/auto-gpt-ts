import * as tiktoken from '@dqbd/tiktoken';
import { IRunParameters } from 'types';

const default_punct_chars = ['!', '.', '?', '։', '؟', '۔', '܀', '܁', '܂', '߹',
'।', '॥', '၊', '။', '።', '፧', '፨', '᙮', '᜵', '᜶', '᠃', '᠉', '᥄',
'᥅', '᪨', '᪩', '᪪', '᪫', '᭚', '᭛', '᭞', '᭟', '᰻', '᰼', '᱾', '᱿',
'‼', '‽', '⁇', '⁈', '⁉', '⸮', '⸼', '꓿', '꘎', '꘏', '꛳', '꛷', '꡶',
'꡷', '꣎', '꣏', '꤯', '꧈', '꧉', '꩝', '꩞', '꩟', '꫰', '꫱', '꯫', '﹒',
'﹖', '﹗', '！', '．', '？', '𐩖', '𐩗', '𑁇', '𑁈', '𑂾', '𑂿', '𑃀',
'𑃁', '𑅁', '𑅂', '𑅃', '𑇅', '𑇆', '𑇍', '𑇞', '𑇟', '𑈸', '𑈹', '𑈻', '𑈼',
'𑊩', '𑑋', '𑑌', '𑗂', '𑗃', '𑗉', '𑗊', '𑗋', '𑗌', '𑗍', '𑗎', '𑗏', '𑗐',
'𑗑', '𑗒', '𑗓', '𑗔', '𑗕', '𑗖', '𑗗', '𑙁', '𑙂', '𑜼', '𑜽', '𑜾', '𑩂',
'𑩃', '𑪛', '𑪜', '𑱁', '𑱂', '𖩮', '𖩯', '𖫵', '𖬷', '𖬸', '𖭄', '𛲟', '𝪈',
'｡', '。'];

type Token = {
    text: string,
    is_punct: boolean,
    i: number
}

type Doc = {
    tokens: Token[],
    c: { sent_start: number }[]
}

type ISentenciserResult = {
    tokenizer_encoding: tiktoken.TiktokenEncoding,
    sents: {
        text: string,
        tokens: number
    }[]
};

export function createSentencizer(
    name: string,
    punct_chars: string[] = default_punct_chars,
    overwrite: boolean = true,
  ) {
  
    return function (tokenizer_encoding: tiktoken.TiktokenEncoding, input: string) : ISentenciserResult {
        const punct_chars_set = punct_chars ? new Set(punct_chars) : new Set(default_punct_chars);

        const enc = tiktoken.get_encoding(tokenizer_encoding);  // Maybe we can use a function to get the encoding from the model
        const ret = enc.encode(input);
        const decoder = new TextDecoder();
        const tokens : Token[] = [...ret].map( (token_number, index) => {
            const text = decoder.decode(enc.decode(Uint32Array.from([token_number])));
            return {
                i: index,
                is_punct: punct_chars_set.has(text),
                text
            } as Token;
        });
        const doc: Doc = {
            tokens,
            c: Array.from(tokens, () => { return { sent_start: 0}; })
        }
    
        const tags = predict([doc]);
        set_annotations([doc], tags);

        // Prepare sentences
        let sents : {text:string, tokens: number}[] = [];
        let current : number[] = [];
        doc.tokens.forEach((token, index) => {
            const c = doc.c[index];
            if( c.sent_start == 1 ) {
                if( current.length ) {
                    sents.push({
                        text: decoder.decode(enc.decode(Uint32Array.from(current))).trim(),
                        tokens: current.length
                    });
                }
                current = [ret[index]];
            } else {
                current.push(ret[index]);
            }
        });
        if( current.length ) {
            sents.push({
                text: decoder.decode(enc.decode(Uint32Array.from(current))).trim(),
                tokens: current.length
            });
        }
        return {
            tokenizer_encoding,
            sents
        };
    
        /**
         * Apply the pipe to a batch of docs, without modifying them.
         *
         * docs (Iterable[Doc]): The documents to predict.
         * RETURNS: The predictions for each document.
         * @returns 
         */
        function predict(docs: Doc[]) {
            if (!docs.some((doc) => doc.tokens.length)) {
                // Handle cases where there are no tokens in any docs.
                const guesses = Array.from({ length: docs.length }, () => []);
                return guesses;
            }
        
            const guesses = [];
            for (const doc of docs) {
                const doc_guesses = Array.from({ length: doc.tokens.length }, () => false);
                if (doc.tokens.length > 0) {
                    let start = 0;
                    let seen_period = false;
                    doc_guesses[0] = true;
                    for (let i = 0; i < doc.tokens.length; i++) {
                        const token = doc.tokens[i];
                        const is_in_punct_chars = punct_chars_set.has(token.text);
                        if (seen_period && !token.is_punct && !is_in_punct_chars) {
                            doc_guesses[start] = true;
                            start = token.i;
                            seen_period = false;
                        } else if (is_in_punct_chars) {
                            seen_period = true;
                        }
                    }
                    if (start < doc.tokens.length) {
                        doc_guesses[start] = true;
                    }
//                    throw new Error("Pending: x: " + doc.tokens.length + ">" + JSON.stringify( doc_guesses));
                }
                guesses.push(doc_guesses);
            }
            return guesses;
        }
        
        function set_annotations(docs: Doc[], batch_tag_ids: any[]) {
            for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            const doc_tag_ids = batch_tag_ids[i];
            for (let j = 0; j < doc_tag_ids.length; j++) {
                const tag_id = doc_tag_ids[j];
                if (doc.c[j].sent_start === 0 || overwrite) {
                    if (tag_id) {
                        doc.c[j].sent_start = 1;
                    } else {
                        doc.c[j].sent_start = -1;
                    }
                }
            }
            }
        }
        };
  }
  
