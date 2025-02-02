import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import LanguageDetector from "i18next-browser-languagedetector";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const language = (new LanguageDetector()).detect();
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(language, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};