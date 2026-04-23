# node-detective-postcss

[![build](https://img.shields.io/github/actions/workflow/status/dependents/node-detective-postcss/node.js.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-detective-postcss/actions/workflows/node.js.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/detective-postcss?logo=npm&logoColor=fff)](https://www.npmjs.com/package/detective-postcss)
[![npm downloads](https://img.shields.io/npm/dm/detective-postcss)](https://www.npmjs.com/package/detective-postcss)

> Find the dependencies of a CSS file (PostCSS dialect)

Supports `@import` and [`@value ... from`](https://github.com/css-modules/postcss-icss-values). Absolute and protocol-relative URLs are automatically filtered out.

The AST is generated using [postcss](https://github.com/postcss/postcss) and [postcss-values-parser](https://github.com/shellscape/postcss-values-parser).

## Installation

```sh
npm install detective-postcss
```

`postcss` must be installed separately as a peer dependency:

```sh
npm install postcss
```

## Usage

```js
const fs = require('node:fs');
const detective = require('detective-postcss');

const content = fs.readFileSync('styles.css', 'utf8');

// Returns an array of imported file paths (e.g. ['foo.css', 'bar.css'])
const dependencies = detective(content);

// Also include url() references (images, fonts, etc.) found in declarations
const allDependencies = detective(content, { url: true });
```

TypeScript / ESM:

```ts
import detective = require('detective-postcss');

const dependencies = detective(content);
const allDependencies = detective(content, { url: true });
```

## API

### `detective(src, options?)`

| Parameter     | Type      | Required | Description                                                                                                                |
| ------------- | --------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src`         | `string`  | Yes      | CSS source code to analyse                                                                                                 |
| `options.url` | `boolean` | No       | When `true`, also extracts `url()` references from declarations (e.g. `background`, `src`, `cursor`). Defaults to `false`. |

Returns `string[]` - the list of local dependency paths found in the source.

Throws `detective.MalformedCssError` if `src` cannot be parsed.

#### What is detected

| Syntax                     | Example                            | Detected by default       |
| -------------------------- | ---------------------------------- | ------------------------- |
| `@import "file.css"`       | `@import "theme.css"`              | yes                       |
| `@import url(file.css)`    | `@import url(print.css)`           | yes                       |
| `@value x from "file.css"` | `@value primary from 'colors.css'` | yes                       |
| `url()` in declarations    | `background: url(bg.png)`          | only with `{ url: true }` |

Absolute URLs (`https://...`) and protocol-relative URLs (`//...`) are always ignored.

## Related

This is the CSS (PostCSS dialect) counterpart to:

- [detective-cjs](https://github.com/dependents/node-detective-cjs) - CommonJS
- [detective-amd](https://github.com/dependents/node-detective-amd) - AMD
- [detective-es6](https://github.com/dependents/node-detective-es6) - ES modules
- [detective-sass](https://github.com/dependents/node-detective-sass) - Sass
- [detective-scss](https://github.com/dependents/node-detective-scss) - SCSS

## License

[MIT](LICENSE)

## Releasing

- Bump the version of `package.json` to a meaningful version for the changes since the last release (we follow semver).
- To do a dry-run of the release and what would go out in the package you can manually execute the [npm-publish](https://github.com/dependents/node-detective-postcss/actions/workflows/npm-publish.yml) workflow on the `main` branch. It will do a dry-run publish (not actually publish the new version).
- Draft a new release in the github project - please use a tag named `vX.X.X` (where `X.X.X` is the new to-be-releases semver of the package - please add as many detail as possible to the release description.
- Once you're ready, `Publish` the release. Publishing will trigger the [npm-publish](https://github.com/dependents/node-detective-postcss/actions/workflows/npm-publish.yml) workflow on the tag and do the actual publish to npm.
