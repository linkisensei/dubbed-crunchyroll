export interface Anime {
    id: string;
    title: string;
    slug: string;
    description: string;
    seasonCount: number;
    year: number;
    lastReleaseDate: string;
    image: string;
    watchLink: string;
    languages : string[];
}


export interface Filters {
    year: string;
    season: string;
    language: string;
    search: string;
}

export interface Page {
    animes : Anime[];
    hasMorePages : boolean;
    currentPage : number;
}