---
unicode-text-segmentation: minor
---

Add a `locale` option to `splitSentences` and `findSentenceBreaks`, which keeps a sentence going after the abbreviations of the locale's language ("Mr. Smith"), as listed by the Unicode CLDR. The default export is now `splitGraphemes`, callable directly, with every named export as a property.
