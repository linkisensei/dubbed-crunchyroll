import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const sourcePath = resolve(__dirname, "../src/assets/data.json");
const destDir = resolve(__dirname, "../public/assets");
const destPath = resolve(destDir, "data.json");

if (existsSync(sourcePath)) {
  try {
    let jsonData = await readFile(sourcePath, "utf8");
    jsonData = JSON.parse(jsonData);

    jsonData.data = jsonData.data.map(function(item){
      return {
        id: item.id,
        title: item.title,
        slug: item.slug_title,
        description: item.description,
        seasonCount: item.series_metadata.season_count,
        year: item.series_metadata.series_launch_year,
        lastReleaseDate: item.last_public,
        image: item.images.poster_wide.flat().find(image => image.width === 320).source,
        watchLink: "https://www.crunchyroll.com/series/" + item.id,
        languages : item.series_metadata.audio_locales,
      }
    });

    await mkdir(destDir, { recursive: true });

    const minifiedJson = JSON.stringify(jsonData.data);

    await writeFile(destPath, minifiedJson);
    console.log("JSON minified!");
  } catch (error) {
    console.error("Error while minifying the JSON file:", error);
  }
} else {
    console.log("JSON file not found!");
}