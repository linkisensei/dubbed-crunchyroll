import { PrismaClient } from "@prisma/client";
import crunchyrollScrapper from "./scrapper/crunchyroll.mjs"
import fs from 'fs';
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

const languages = [
    "pt-BR",
    "es-ES",
    "ja-JP",
    "ar-SA",
    "ru-RU",
    "de-DE",
    "fr-FR",
    "hi-IN",
    "te-IN",
    "ta-IN",
    "en-US",
];


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

function translateSerieToTranslation(serie, language){
    const translation = {
        animeId: serie.id,
        title: serie.title,
        language: language,
        description: serie.description,
        descriptors: serie.series_metadata.content_descriptors ?? [],
    };

    return translation;
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

async function upsertTranslation(translation){
    // let descriptors = JSON.stringify(translation.descriptors ?? null);
    let descriptors = null;
    const upsertedTranslation = await prisma.translations.upsert({
        where: { 
            animeId_language: {
                animeId: translation.animeId,
                language: translation.language
            }
        },
        update: {
            title: translation.title,
            description: translation.description,
            descriptors,
        },
        create: {
            animeId : translation.animeId,
            language: translation.language,
            title: translation.title,
            description: translation.description,
            descriptors,
        },
    });

    return upsertedTranslation;
}

async function upsertTranslations(translations) {
    await prisma.$transaction(
        translations.map((translation) => {
            const descriptors = translation.descriptors 
                ? JSON.stringify(translation.descriptors) 
                : null;

            return prisma.translations.upsert({
                where: { 
                    animeId_language: {
                        animeId: translation.animeId,
                        language: translation.language
                    }
                },
                update: {
                    title: translation.title,
                    description: translation.description,
                    descriptors,
                },
                create: {
                    animeId: translation.animeId,
                    language: translation.language,
                    title: translation.title,
                    description: translation.description,
                    descriptors,
                },
            });
        })
    );
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
    const data = {};

    const __dirname = fileURLToPath(new URL(".", import.meta.url));
    const destDir = resolve(__dirname, "../public/assets");
    mkdirSync(destDir, { recursive: true });

    languages.forEach((language) => {
        data[language] = [];
    });

    const animes = await prisma.anime.findMany({
        orderBy: {
            lastReleaseDate: "asc", // Will be inverted by .pop()
        },
        include: {
            translations: true,
        },
    });

    // Separating translated versions
    while(animes.length > 0){
        let anime = animes.pop();
        languages.forEach((language) => {
            const animeData = JSON.parse(anime.data);
            const translation = anime.translations.find((t) => t.language == language);

            if(!translation){
                data[language].push(animeData);
                return;
            }

            if(translation.title.length){
                animeData.title = translation.title;
            }

            if(translation.description.length){
                animeData.description = translation.description;
            }
            
            data[language].push(animeData);
        });
    }


    // Saving files:
    languages.forEach((language) => {
        const destPath = resolve(destDir, `${language}.json`);
        fs.writeFileSync(destPath, JSON.stringify(data[language]), 'utf8');
    });
}

async function updateAnimeTranslations(language){
    try {
        let series = await crunchyrollScrapper.getAnimes(language);
        series = series.data.map((serie) => translateSerieToTranslation(serie, language));
        await upsertTranslations(series);

    } catch (error) {
        console.error(error);
    }
}

async function main() {
  await crunchyrollScrapper.initPuppeteer();

  // Updating animes list
  let animes = await crunchyrollScrapper.getAnimes();
  let counter = 0;

  // Updating info on updated animes
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
        continue;
    }

    try {
        anime = await crunchyrollScrapper.getAnimeInfo(anime);
    } catch (error) {
        console.error(error);
    }

    try {
        console.info(`Updating "${anime.id}"`);
        await upsertAnime(translateSerieToAnime(anime));
        counter++;
    } catch (error) {
        console.error(error);
    }
  }

  console.info(`Done. ${counter} animes updated!`)

  // Updating translations
  for (let i = 0; i < languages.length; i++) {
    const language = languages[i];

    await updateAnimeTranslations(language);
  }

  await crunchyrollScrapper.closePuppeteer();


  // Exporting files
  console.info(`Exporting animes to JSON...`);
  await exportAnimes();
  console.info(`Finished exporting animes to JSON!`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });