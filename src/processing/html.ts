import cheerio, { CheerioAPI } from 'cheerio';

export function extract_hyperlinks(soup: CheerioAPI, baseUrl: string): [string, string][] {
  const hyperlinks: [string, string][] = [];

  soup('a[href]').each((_, element) => {
    const link = soup(element);
    const linkText = link.text();
    const linkUrl = new URL(link.attr('href') || '', baseUrl).toString();

    hyperlinks.push([linkText, linkUrl]);
  });

  return hyperlinks;
}

export function format_hyperlinks(hyperlinks: [string, string][]): string[] {
  return hyperlinks.map(([linkText, linkUrl]) => `${linkText} (${linkUrl})`);
}
