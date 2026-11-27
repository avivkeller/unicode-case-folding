# unicode-display-width

## 1.1.0

### Minor Changes

- 26574bd: Find grapheme clusters with `unicode-text-segmentation` rather than the JavaScript engine, and type the result of `codePointWidth()` as `0 | 1 | 2`.
