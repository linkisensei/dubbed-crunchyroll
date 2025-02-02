import { PrismaClient } from "@prisma/client";
import crunchyrollScrapper from "./scrapper/crunchyroll.mjs"
import fs from 'fs';
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

function translateSerieToAnime(serie){
    const anime = {
        id: serie.id,
        title: serie.title,
        slug: serie.slug_title,
        description: serie.description,
        seasonCount: serie.series_metadata.season_count ?? serie.season_count,
        year: serie.series_metadata.series_launch_year ?? serie.series_launch_year,
        lastReleaseDate: serie.last_public,
        image: serie.images.poster_wide.flat().find(image => image.width === 320).source,
        watchLink: "https://www.crunchyroll.com/series/" + serie.id,
        languages : serie.series_metadata.audio_locales,
        keywords : serie.keywords ?? [],
        episodeCount : serie.episode_count ?? 0,
    };

    if(!!serie.season_tags){
        anime.seasonTags = serie.season_tags;
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

async function upsertAnime(anime){
    const data = JSON.stringify(anime);
    const lastReleaseDate = new Date(anime.lastReleaseDate);
    const upsertedAnime = await prisma.anime.upsert({
        where: { id : anime.id },
            update: {
                lastReleaseDate,
                data,
            },
            create: {
                id : anime.id,
                lastReleaseDate,
                data,
            },
    });

    return upsertedAnime;
}

async function getAnime(id, includeData = false){
    const select = {
        id: true,
        lastReleaseDate: true,
        data : false,
    };

    if(includeData){
        select.data = true;
    }

    const anime = await prisma.anime.findUnique({
        where: { id },
        select,
    });

    return anime;
}

async function exportAnimes(){
    let animes = await prisma.anime.findMany({
        orderBy: {
            lastReleaseDate: "desc",
        },
    });

    const __dirname = fileURLToPath(new URL(".", import.meta.url));
    const destDir = resolve(__dirname, "../public/assets");
    const destPath = resolve(destDir, "data.json");

    mkdirSync(destDir, { recursive: true });

    animes = animes.map((anime) => JSON.parse(anime.data));
    fs.writeFileSync(destPath, JSON.stringify(animes), 'utf8');
}

async function main() {
  await crunchyrollScrapper.initPuppeteer();

  const animes = await crunchyrollScrapper.getAnimes();
  let counter = 0;

  while(animes.data.length > 0){
    let anime = animes.data.pop();
    let existing = null;

    try {
        existing = await getAnime(anime.id);
    } catch (error) {
        console.error(error);
        existing = null;
    }

    if(existing && existing.lastReleaseDate >= new Date(anime.last_public)){
        console.info(`Ignoring "${anime.id}"`);
        continue;
    }

    try {
        anime = await crunchyrollScrapper.getAnimeInfo(anime);
    } catch (error) {
        console.error(error);
    }

    try {
        console.info(`Upserting "${anime.id}"`);
        await upsertAnime(translateSerieToAnime(anime));
        counter++;
    } catch (error) {
        console.error(error);
    }
  }

  await crunchyrollScrapper.closePuppeteer();

  console.info(`Done. ${counter} animes upserted!`)

  console.info(`Exporting animes to data.json...`);
  await exportAnimes();
  console.info(`Finished exporting animes to data.json!`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });