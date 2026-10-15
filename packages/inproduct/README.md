# @mp-lb/inproduct

Small tools that live in your application. This initial package exports `slugify` only.
No runtime dependencies, hosted service, secrets or database are required.

## Install

```sh
pnpm add @mp-lb/inproduct
```

Node.js 22.13+; ESM only. TypeScript declarations and declaration maps are included.

```js
import { slugify } from '@mp-lb/inproduct';
console.log(slugify('  Everyday Mug! ')); // everyday-mug
console.log(slugify('Café')); // caf
```

Slugs use lowercase ASCII letters and digits. Other character runs become hyphens.
Non-ASCII-only or punctuation-only input can yield an empty string. The caller owns validation
and uniqueness; this utility does not transliterate, persist records or provide commerce APIs.

For example, `slugify('Café')` returns `caf`, while `slugify('!!!')` returns an empty string.
Distinct labels can also produce the same slug, so check for collisions before using a slug
as a database key or URL.

See [installation](https://github.com/mp-lb/inproduct/blob/main/docs/public/installation.mdx),
[backend integration](https://github.com/mp-lb/inproduct/blob/main/docs/public/backend.mdx),
and the [local-only MyShop example](https://github.com/mp-lb/inproduct/tree/main/apps/myshop-frontend).
