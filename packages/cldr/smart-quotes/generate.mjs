import * as cldr from "@internal/build/sources/cldr";
import { encodeLocaleTable } from "@internal/helpers/locale";

export const VERSION = await cldr.version();

const delimiters = await cldr.localeData("cldr-misc-full", "delimiters");
const likelySubtags = await cldr.likelySubtags();

export const QUOTES = encodeLocaleTable(
  new Map(
    [...delimiters].map(([locale, quotes]) => [
      locale,
      [
        quotes.quotationStart,
        quotes.quotationEnd,
        quotes.alternateQuotationStart,
        quotes.alternateQuotationEnd,
      ],
    ]),
  ),
  likelySubtags,
);
