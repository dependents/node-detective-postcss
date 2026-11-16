import { debuglog } from 'node:util';
import isUrl from 'is-url-superb';
import { list, parse, type AtRule, type Root } from 'postcss';
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

  root.walkAtRules((rule) => {
    let file: string | undefined;

    if (isImportRule(rule)) {
      // only the first component is the file; the rest are media queries,
      // layer() or supports() conditions which aren't plain values
      const [first] = list.space(rule.params);
      const node = first ? parseValue(first)[0] : undefined;
      if (node) {
        file = getValueOrUrl(node);
        if (file) {
          debug('found %s of %s', '@import', file);
        }
      }
    }

    if (isValueRule(rule)) {
      // `@value name: value` isn't a plain value either, so only parse the
      // last component (the source after `from`, or the value itself)
      const parts = list.space(rule.params);
      const last = parts.at(-1);
      const lastNode = last ? parseValue(last).at(-1) : undefined;
      if (!lastNode) return;

      if (parts.at(-2) === 'from') {
        file = getValueOrUrl(lastNode);
        if (file) {
          debug('found %s of %s', '@value with import', file);
        }
      }

      if (options.url && isUrlNode(lastNode)) {
        file = getValueOrUrl(lastNode);
        if (file) {
          debug('found %s of %s', 'url() in @value', file);
        }
      }
    }

    if (file) references.push(file);
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

function isValueRule(rule: AtRule) {
  return rule.name === 'value';
}

function isImportRule(rule: AtRule) {
  return rule.name === 'import';
}

detective.MalformedCssError = MalformedCssError;

export default detective;
