import { PrismaClient } from "@prisma/client";
import crunchyrollScrapper from "./scrapper/crunchyroll.mjs"
import fs from 'fs';

const prisma = new PrismaClient();

function translateSerieToAnime(serie){
    const anime = {
        id: serie.id,
        title: serie.title,
        slug: serie.slug_title,
        description: serie.description,
        seasonCount: serie.series_metadata.season_count,
        year: serie.series_metadata.series_launch_year,
        lastReleaseDate: serie.last_public,
        image: serie.images.poster_wide.flat().find(image => image.width === 320).source,
        watchLink: "https://www.crunchyroll.com/series/" + serie.id,
        languages : serie.series_metadata.audio_locales,
    };

    if(!!serie.season_tags){
        anime.season_tags = serie.season_tags;
    }

    return anime;
}

async function insertAnime(anime){
    const newAnime = await prisma.anime.create({
        data: {
            id: anime.id,
            lastReleaseDate: new Date(anime.lastReleaseDate),
            data: JSON.stringify(anime),
        },
    });

    return newAnime;
}

async function updateAnime(anime){
    const updatedAnime = await prisma.anime.update({
        where: { id },
        data: {
            lastReleaseDate: new Date(anime.lastReleaseDate),
            data: JSON.stringify(anime),
        },
    });

    return updatedAnime;
}

async function getAnime(id, includeData = false){

}

async function main() {
  await crunchyrollScrapper.initPuppeteer();

  const animes = await crunchyrollScrapper.getAnimes();

  await crunchyrollScrapper.closePuppeteer();
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });