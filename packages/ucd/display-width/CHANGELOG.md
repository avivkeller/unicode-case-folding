# unicode-display-width

## 1.2.0

### Minor Changes

- 82d75d7: The default export is now the main function of the package, callable directly, with every named export as a property.

## 1.1.0

### Minor Changes

- 26574bd: Find grapheme clusters with `unicode-text-segmentation` rather than the JavaScript engine, and type the result of `codePointWidth()` as `0 | 1 | 2`.
