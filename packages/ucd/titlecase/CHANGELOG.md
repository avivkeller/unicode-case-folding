# unicode-titlecase

## 1.2.0

### Minor Changes

- 82d75d7: The default export is now the main function of the package, callable directly, with every named export as a property.

## 1.1.0

### Minor Changes

- 26574bd: Find words with `unicode-text-segmentation` (the default Unicode word boundaries) rather than the JavaScript engine's locale-specific segmenter. Pass `segmenter` to keep using `Intl.Segmenter`.
