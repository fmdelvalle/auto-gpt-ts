import axios from 'axios';

const HTML_TAG_CLEANER = /<.*?>|&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-f]{1,6});/;

export async function _wikipedia_search(language: string, query: string, num_results: number = 5) {
    const encodedQuery = encodeURIComponent(query);
    const search_url = `https://${language}.wikipedia.org/w/api.php?action=query&format=json&list=search&utf8=1&formatversion=2&srsearch=${encodedQuery}`;
    console.log("Wikipedia search url: ", search_url);

    try {
        const response = await axios.get(search_url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.49 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        const items = [];
        try {
            const results = response.data;
            for (const item of results.query.search) {
                const summary = item.snippet.replace(HTML_TAG_CLEANER, '');
                items.push({
                    'title': item.title,
                    'summary': summary,
                    'url': `http://${language}.wikipedia.org/?curid=${item.pageid}`
                });
                if (items.length === num_results) {
                    break;
                }
            }
            return JSON.stringify(items, null, 4);
        } catch (e) {
            return `'wikipedia_search' on query: '${query}' raised exception: '${e}'`;
        }
    } catch (error) {
        return `'wikipedia_search' request failed with error: ${error}`;
    }
}
