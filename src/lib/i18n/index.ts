import { id, type Dictionary } from "./id";
import { en } from "./en";

export type Locale = "id" | "en";

const dictionaries: Record<Locale, Dictionary> = { id, en };

const locale: Locale =
  (process.env.APP_LOCALE as Locale) === "en" ? "en" : "id";

export function getDictionary(): Dictionary {
  return dictionaries[locale];
}

export function getLocale(): Locale {
  return locale;
}

export const t = getDictionary();
export { id, en };
