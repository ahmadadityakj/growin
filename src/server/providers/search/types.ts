export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchProvider {
  name: string;
  /** Cari URL kandidat bisnis untuk query tertentu */
  search(query: string, opts?: { count?: number; country?: string }): Promise<SearchResultItem[]>;
}
