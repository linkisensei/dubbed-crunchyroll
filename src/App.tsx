import { useState, useEffect, ChangeEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Play, Loader2 } from "lucide-react";
import crunchyrollService from "@/services/crunchyrollService";
import { Anime, Filters, Page } from "@/types";
import { Separator } from "@radix-ui/react-select";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { formatDate } from "./lib/utils";


const languages = [
  { value: "pt-BR", name: "🇧🇷 Português (Brasil)" },
  { value: "ja-JP", name: "🇯🇵 日本語 (日本)" },
  { value: "en-US", name: "🇺🇸 English (United States)" },
  { value: "es-419", name: "🇱🇦 Español (Latinoamérica)" },
  { value: "es-ES", name: "🇪🇸 Español (España)" },
  { value: "ar-SA", name: "🇸🇦 العربية (السعودية)" },
  { value: "ru-RU", name: "🇷🇺 Русский (Россия)" },
  { value: "de-DE", name: "🇩🇪 Deutsch (Deutschland)" },
  { value: "fr-FR", name: "🇫🇷 Français (France)" },
  { value: "hi-IN", name: "🇮🇳 हिन्दी (भारत)" },
  { value: "te-IN", name: "🇮🇳 తెలుగు (భారతదేశం)" },
  { value: "ta-IN", name: "🇮🇳 தமிழ் (இந்தியா)" }
];

export default function App() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [seasons, setSeasons] = useState<{ [key: string]: string }>({});
  const [years, setYears] = useState<string[]>([]);
  const [items, setAnimes] = useState<Anime[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMorePages, setHasMorePages] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>({
    year: currentYear.toString(),
    season: "all",
    language: "pt-BR",
    search: ""
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [stringsLoaded, setStringsLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (i18next.isInitialized) {
      setSeasons({
        all: t("all_seasons"),
        spring: t("spring"),
        summer: t("summer"),
        fall: t("fall"),
        winter: t("winter"),
      });

      setYears([
        t("all_years"),
        ...Array.from({ length: currentYear - 2009 + 1 }, (_, i) => (currentYear - i).toString()),
      ]);

      setStringsLoaded(true);
    } else {
      i18next.on("initialized", () => {
        setSeasons({
          all: t("all_seasons"),
          spring: t("spring"),
          summer: t("summer"),
          fall: t("fall"),
          winter: t("winter"),
        });

        setYears([
          t("all_years"),
          ...Array.from({ length: currentYear - 2009 + 1 }, (_, i) => (currentYear - i).toString()),
        ]);

        setStringsLoaded(true);
      });
    }
  }, []);
  
  useEffect(() => {
    setLoading(true);
    crunchyrollService.filterAnimes(filters, page).then((page : Page) => {
      setAnimes(page.animes);
      setHasMorePages(page.hasMorePages);
      setLoading(false);
    });
  }, [page, filters]);
  
  const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  };

  if(!stringsLoaded){
    return <div className="bg-[#37415C] min-h-screen">
      <div className="flex justify-center my-10">
        <Loader2 className="w-10 h-10 animate-spin text-gray-500" />
      </div>
    </div>;
  }

  return (
    <div className="bg-[#37415C] min-h-screen">
      <div className="w-full bg-white py-6 shadow-md">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-center mb-4">{t('site_title')}</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ano</label>
              <Select value={filters.year} onValueChange={(value) => setFilters({ ...filters, year: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Estação do ano</label>
              <Select value={filters.season} onValueChange={(value) => setFilters({ ...filters, season: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(seasons).map((season) => (
                    <SelectItem key={season} value={season}>{seasons[season]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Idioma</label>
              <Select value={filters.language} onValueChange={(value) => setFilters({ ...filters, language: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.name} value={lang.value}>{lang.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Buscar por nome</label>
              <Input name="search" placeholder="Nome do anime..." onChange={handleFilterChange} />
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 max-w-5xl mx-auto">
        {loading ? (
          <div className="flex justify-center my-10">
            <Loader2 className="w-10 h-10 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item) => (
              <Card key={item.id} className="flex flex-col rounded-lg shadow-md bg-white border-[#242E49] max-h-100 overflow-hidden">
                <img src={item.image} alt={item.title} className="w-full h-40 object-cover rounded-t-md" />
                <CardContent className="flex flex-col justify-between p-4 w-full h-full overflow-hidden">
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <pre className="text-gray-500 text-sm overflow-y-auto max-h-36 whitespace-pre-wrap">{item.description}</pre>
                  <p className="text-sm"><strong>Adicionado em:</strong> {item.year}</p>
                  <p className="text-sm"><strong>Último Lançamento:</strong> {formatDate(item.lastReleaseDate)}</p>
                  <p className="text-sm"><strong>Temporadas:</strong> {item.seasonCount}</p>
                  <Separator/>
                  <a href={item.watchLink} target="_blank" className="mt-2 bg-blue-500 text-white p-2 rounded-full flex items-center justify-center shadow-md">
                    <Play size={20} />
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <div className="flex justify-center gap-4 mt-6">
          <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50">Anterior</button>
          <span className="px-4 py-2 font-bold text-white bg-gray-700 rounded">{page}</span>
          <button onClick={() => setPage(page + 1)} disabled={!hasMorePages} className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50">Próximo</button>
        </div>
      </div>
    </div>
  );
}
