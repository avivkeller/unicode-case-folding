# unicode-titlecase

## 1.1.0

### Minor Changes

- 26574bd: Find words with `unicode-text-segmentation` (the default Unicode word boundaries) rather than the JavaScript engine's locale-specific segmenter. Pass `segmenter` to keep using `Intl.Segmenter`.
