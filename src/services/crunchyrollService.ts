import { Anime, Filters, Page } from "@/types";

const DATA = {
    total : 0,
    data : [],
};

const PAGE_SIZE = 20;

async function loadData(){
    const data = await fetch("/assets/data.json")
        .then((response) => {
            if (!response.ok) {
            throw new Error("Failed to fetch data");
            }
            return response.json();
        });

    DATA.data = data;    
    DATA.total = data.length;  
}

type AnimeFilterFunction = (anime: Anime) => boolean;
  
async function filterAnimes(filters : Filters, pageNumber : number): Promise<Page> {
    if(!DATA.total){
        await loadData();
    }

    const page = {
        animes : [],
        hasMorePages : false,
        currentPage : pageNumber,
    };

    let year = !!filters.year ? parseInt(filters.year) : null;
    let season = !!filters.season && filters.season != 'all' ? filters.season : null;
    let language = filters.language;
    let search = !!filters.search ? filters.search.trim() : null;

    const filterFunctions : AnimeFilterFunction[] = [];

    let minIndex = (pageNumber -1) * PAGE_SIZE;
    let maxIndex = (pageNumber) * PAGE_SIZE;

    if(year && season){
        const seasonTag = `${season}-${year}`;
        filterFunctions.push(function(anime: Anime) : boolean {
            return anime.seasonTags.includes(seasonTag);
        });
    }

    if(year && !season){
        filterFunctions.push(function(anime: Anime) : boolean {
            return anime.year == year || !!anime.seasonTags.some(seasonTag => seasonTag.endsWith(year.toString()));
        });
    }

    if(!year && season){
        filterFunctions.push(function(anime: Anime) : boolean {
            return !!anime.seasonTags.some(seasonTag => seasonTag.startsWith(season));
        });
    }

    filterFunctions.push(function(anime: Anime) : boolean {
        return anime.languages.includes(language);
    });

    if(search){
        filterFunctions.push(function(anime: Anime) : boolean {
            return anime.title.toLocaleLowerCase().includes(search.toLocaleLowerCase());
        });
    }

    let counter = 0;
    page.animes = DATA.data.filter(function (anime: Anime) : boolean {
        for (let i = 0; i < filterFunctions.length; i++) {
            const filterFunction = filterFunctions[i];
            if(!filterFunction(anime)){
                return false;
            }
        }

        counter++;

        if(counter <= minIndex){
            return false;
        }

        if(counter > maxIndex){
            page.hasMorePages = true;
            return false;
        }

        return true;
    })

    return page;
}

export default {
    filterAnimes,
};