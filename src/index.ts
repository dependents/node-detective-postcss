import { debuglog } from 'node:util';
import isUrl from 'is-url-superb';
import { list, parse, type Root } from 'postcss';
import {
  parse as postCssParseValue,
  Quoted,
  Word,
  type Node,
} from 'postcss-values-parser';

const debug = debuglog('detective-postcss');

export class MalformedCssError extends Error {}

export interface Options {
  url?: boolean;
}

function detective(src: string, options: Options = {}): string[] {
  let root: Root;

  try {
    root = parse(src);
  } catch {
    throw new MalformedCssError();
  }

  const references: string[] = [];

  root.walkAtRules(/^(import|value)$/, (rule) => {
    // at-rule params aren't plain values (media queries, layer(),
    // `name: value`), so only parse the component holding the reference:
    // the first one for @import, the last one for @value
    const parts = list.space(rule.params);
    const isImport = rule.name === 'import';
    const part = isImport ? parts[0] : parts.at(-1);
    const nodes = part ? parseValue(part) : [];
    const node = isImport ? nodes[0] : nodes.at(-1);
    if (!node) return;

    const isReference =
      isImport || parts.at(-2) === 'from' || (options.url && isUrlNode(node));
    const file = isReference ? getValueOrUrl(node) : undefined;

    if (file) {
      debug('found %s of %s', `@${rule.name}`, file);
      references.push(file);
    }
  });

  if (!options.url) return references;

  root.walkDecls((decl) => {
    if (!/url\(/i.test(decl.value)) return;

    const files = parseValue(decl.value)
      .filter((node) => isUrlNode(node))
      .map((node) => getValueOrUrl(node))
      .filter(Boolean) as string[];

    for (const file of files) {
      debug('found %s of %s', 'url() in declaration', file);
    }

    references.push(...files);
  });

  return references;
}

function parseValue(value: string): Node[] {
  try {
    return postCssParseValue(value).nodes as unknown as Node[];
  } catch {
    throw new MalformedCssError();
  }
}

function getValueOrUrl(node: Node): string | undefined {
  // url() nodes are Word nodes holding the url's contents
  let ret: string;
  if (node instanceof Quoted) {
    ret = node.contents;
  } else if (node instanceof Word) {
    ret = node.value;
  } else {
    return undefined;
  }

  // is-url-superb uses new URL() which doesn't accept protocol-relative URLs;
  // prepend http: so they get correctly identified and filtered out
  return isUrl(ret.startsWith('//') ? `http:${ret}` : ret) ? undefined : ret;
}

/**
 * postcss-values-parser turns url() into a Word node holding just the url's
 * contents, so the only way to tell it apart from a plain word is to look at
 * the source text it was parsed from.
 */
function isUrlNode(node: Node): boolean {
  if (!(node instanceof Word) || !node.source?.input) return false;

  const { input, start, end } = node.source;
  const sourceText = input.css.slice(start?.offset, end?.offset);
  return /^url\(/i.test(sourceText);
}

detective.MalformedCssError = MalformedCssError;

export default detective;
