# cldr-format-name

## 1.1.0

### Minor Changes

- 26574bd: Accept every name field with modifiers, such as `given-vocative`, in the `PersonName` type, and require a given name or a surname. Capitalize with `unicode-uppercase` and `unicode-titlecase`, and find the grapheme clusters, script and likely locale of a name with `unicode-text-segmentation`, `unicode-script-property` and `cldr-likely-subtags`, rather than with the JavaScript engine.
