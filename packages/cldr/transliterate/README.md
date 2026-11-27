# cldr-transliterate

Romanizes text in other scripts with the transforms of the
[Unicode CLDR](https://cldr.unicode.org/), giving the same results as ICU's
`Any-Latin` transliterator: Cyrillic, Greek, Chinese, Japanese, Korean,
Arabic, Hebrew, Thai, Georgian, Armenian, Ethiopic, Indic scripts and more.
The CLDR transform rules
([UTS #35, Transforms](https://www.unicode.org/reports/tr35/tr35-general.html#Transforms))
are compiled when the package is built, so it does not parse rules at run
time.

## Installation

```sh
npm install cldr-transliterate
```

## Usage

```js
import { toLatin, transliterate } from "cldr-transliterate";

toLatin("Привет"); // "Privet"
toLatin("Ελληνικά"); // "Ellēniká"
toLatin("こんにちは"); // "kon'nichiha"
toLatin("안녕하세요"); // "annyeonghaseyo"
toLatin("你好"); // "nǐ hǎo"
toLatin("नमस्ते"); // "namastē"
toLatin("Moscow is Москва, Tokyo is 東京"); // "Moscow is Moskva, Tokyo is dōng jīng"

// Without accents, with CLDR's Latin-ASCII transform
toLatin("Ελληνικά", { ascii: true }); // "Ellenika"
toLatin("你好", { ascii: true }); // "ni hao"

transliterate("Привет", "Cyrillic-Latin"); // "Privet"
transliterate("Crème brûlée", "Latin-ASCII"); // "Creme brulee"
```

Each transform is also a function of its own. Bundlers leave out the
transforms an application does not import, which matters for Chinese,
whose data is most of the package:

```js
import { cyrillicToLatin, hanToLatin, latinToAscii } from "cldr-transliterate";

cyrillicToLatin("Москва"); // "Moskva"
hanToLatin("北京"); // "běi jīng"
latinToAscii(hanToLatin("北京")); // "bei jing"
```

The default export is `transliterate`, with every export as a property:
`import transliterate from "cldr-transliterate"`.

## API

### `toLatin(text, options?)`

Transliterates each run of text in one script with that script's transform,
as ICU's `Any-Latin` does. Spaces and punctuation belong to the runs on both
sides of them. Latin text, and scripts without a transform (such as Sinhala,
Tibetan and, as in ICU, Canadian Aboriginal syllabics), are left as they
are. With `{ ascii: true }`, the result then goes through `Latin-ASCII`.

### `transliterate(text, id)`

Transliterates text with one transform, by its ID from `getTransformIds()`
or a CLDR alias (such as `"Cyrl-Latn"` or `"und-Latn-t-und-cyrl"`). Case does
not matter. Throws a `RangeError` for other IDs.

### `getTransformIds()`

Returns the IDs of the transforms: `"Any-Latin"`, `"Latin-ASCII"`, and the
transforms of `Any-Latin`.

| ID                 | Function            | Example                     |
| ------------------ | ------------------- | --------------------------- |
| `Arabic-Latin`     | `arabicToLatin`     | مرحبا → mrḥbạ               |
| `Armenian-Latin`   | `armenianToLatin`   | Բարեւ → Barew               |
| `Bengali-Latin`    | `bengaliToLatin`    | বাংলা → bānlā               |
| `Bopomofo-Latin`   | `bopomofoToLatin`   | ㄋㄧˇ ㄏㄠˇ → ni3 hao3      |
| `Cyrillic-Latin`   | `cyrillicToLatin`   | Привет → Privet             |
| `Devanagari-Latin` | `devanagariToLatin` | नमस्ते → namastē            |
| `Ethiopic-Latin`   | `ethiopicToLatin`   | ሰላም → salām                 |
| `Georgian-Latin`   | `georgianToLatin`   | გამარჯობა → gamarjoba       |
| `Greek-Latin`      | `greekToLatin`      | Ελληνικά → Ellēniká         |
| `Gujarati-Latin`   | `gujaratiToLatin`   | ગુજરાતી → gujarātī          |
| `Gurmukhi-Latin`   | `gurmukhiToLatin`   | ਪੰਜਾਬੀ → pajābī             |
| `Han-Latin`        | `hanToLatin`        | 你好 → nǐ hǎo               |
| `Hangul-Latin`     | `hangulToLatin`     | 안녕하세요 → annyeonghaseyo |
| `Hant-Latn`        | `hantToLatin`       | 沈 → chén (Han-Latin: shěn) |
| `Hebrew-Latin`     | `hebrewToLatin`     | שלום → şlwm                 |
| `Hiragana-Latin`   | `hiraganaToLatin`   | こんにちは → kon'nichiha    |
| `Kannada-Latin`    | `kannadaToLatin`    | ಕನ್ನಡ → kannaḍa             |
| `Katakana-Latin`   | `katakanaToLatin`   | カタカナ → katakana         |
| `Latin-ASCII`      | `latinToAscii`      | Ærøskøbing → AEroskobing    |
| `Malayalam-Latin`  | `malayalamToLatin`  | മലയാളം → malayāḷaṁ          |
| `Myanmar-Latin`    | `myanmarToLatin`    | မြန်မာ → myanmar            |
| `Oriya-Latin`      | `oriyaToLatin`      | ଓଡ଼ିଆ → ōṛi'ā               |
| `Syriac-Latin`     | `syriacToLatin`     | ܫܠܡܐ → shlmʾ                |
| `Tamil-Latin`      | `tamilToLatin`      | தமிழ் → tamiḻ               |
| `Telugu-Latin`     | `teluguToLatin`     | తెలుగు → telugu             |
| `Thaana-Latin`     | `thaanaToLatin`     | ދިވެހި → divehi             |
| `Thai-Latin`       | `thaiToLatin`       | สวัสดีครับ → s̄wạs̄dī khrạb   |

`Han-Latin` gives the usual Mandarin readings, and `Hant-Latn` those usual
in Traditional Chinese. `Bopomofo-Latin` gives pinyin with tone numbers, as
in ICU.

### `VERSION`

The CLDR version of the data, such as `"49.0.0"`.

## Conformance

The results are those of ICU 79 (CLDR 49) for every assigned character on
its own and for tens of thousands of random and real texts, and the package
passes all of CLDR's transform test data for these transforms (14,517
cases). It differs from ICU in two cases:

- Thai word boundaries come from the JavaScript engine's `Intl.Segmenter`,
  so words may be separated differently than by ICU's own version.
- Rules that copy text matched before the cursor, such as those for the
  Japanese iteration marks ゝ and ヽ, copy half of a UTF-16 surrogate pair in
  ICU when a character outside the Basic Multilingual Plane is at the start
  of that text or before it. This package copies whole characters.

## License

MIT. Includes data from the Unicode CLDR and the Unicode Character Database, © Unicode, Inc., under the [Unicode License v3](https://www.unicode.org/license.txt).
