-- CreateTable
CREATE TABLE "Translations" (
    "animeId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptors" TEXT NOT NULL,

    PRIMARY KEY ("animeId", "language"),
    CONSTRAINT "Translations_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
