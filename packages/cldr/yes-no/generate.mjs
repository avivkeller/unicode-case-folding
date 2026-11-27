import * as cldr from "@internal/build/sources/cldr";
import { encodeLocaleTable } from "@internal/helpers/locale";

export const VERSION = await cldr.version();

const posix = await cldr.localeData("cldr-misc-full", "posix");
const likelySubtags = await cldr.likelySubtags();

const answers = (list) =>
  list.split(":").map((answer) => answer.normalize("NFC"));

export const ANSWERS = encodeLocaleTable(
  new Map(
    [...posix].map(([locale, { messages }]) => [
      locale,
      [answers(messages.yesstr), answers(messages.nostr)],
    ]),
  ),
  likelySubtags,
);
