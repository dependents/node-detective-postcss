import { debuglog } from 'util';
import isUrl = require('is-url-superb');
import { parse, AtRule } from 'postcss';
import {
  parse as postCssParseValue,
  ChildNode,
  Func,
  Word,
  Numeric,
  Operator,
  Punctuation,
  Quoted,
} from 'postcss-values-parser';

const debug = debuglog('detective-postcss');

function detective(src: string, options: detective.Options = { url: false }) {
  let references: string[] = [];
  let root;
  try {
    root = parse(src);
  } catch {
    throw new detective.MalformedCssError();
  }

  root.walkAtRules((rule) => {
    let file = null;
    if (isImportRule(rule)) {
      const firstNode = postCssParseValue(rule.params).first;
      if (firstNode) {
        file = getValueOrUrl(firstNode);
        if (file) {
          debug('found %s of %s', '@import', file);
        }
      }
    }

    if (isValueRule(rule)) {
      const lastNode = postCssParseValue(rule.params).last;
      if (!lastNode) return;

      const prevNode = lastNode.prev();

      if (prevNode && isFrom(prevNode)) {
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
    const { nodes } = postCssParseValue(decl.value);
    const files = nodes
      .filter((node) => isUrlNode(node))
      .map((node) => getValueOrUrl(node))
      .filter((file): file is string => Boolean(file));

    for (const file of files) {
      debug('found %s of %s', 'url() in declaration', file);
    }

    references = references.concat(files);
  });

  return references;
}

function getValueOrUrl(node: ChildNode): string | false {
  const ret = isUrlNode(node) ? getUrlContent(node) : getValue(node);

  // is-url-superb uses new URL() which doesn't accept protocol-relative URLs;
  // prepend http: so they get correctly identified and filtered out
  return !isUrl(ret.startsWith('//') ? `http:${ret}` : ret) && ret;
}

function getUrlContent(urlNode: Func): string {
  const first = urlNode.nodes[0];

  // Quoted: url('foo.css') or url("foo.css")
  if (first && first.type === 'quoted') {
    return first.contents;
  }

  // Unquoted: reconstruct the full string from all child nodes (handles
  // absolute URLs like url(https://...) which parse as multiple tokens)
  return urlNode.nodes
    .filter((n) => isNodeWithValue(n))
    .map((n) => getValue(n))
    .join('');
}

function getValue(node: ChildNode) {
  if (!isNodeWithValue(node)) {
    throw new Error('Unexpectedly found a node without a value');
  }

  return node.type === 'quoted' ? node.contents : node.value;
}

function isNodeWithValue(
  node: ChildNode,
): node is Word | Numeric | Operator | Punctuation | Quoted {
  return ['word', 'numeric', 'operator', 'punctuation', 'quoted'].includes(
    node.type,
  );
}

function isUrlNode(node: ChildNode): node is Func {
  return node.type === 'func' && node.name === 'url';
}

function isValueRule(rule: AtRule) {
  return rule.name === 'value';
}

function isImportRule(rule: AtRule) {
  return rule.name === 'import';
}

function isFrom(node: ChildNode): node is Word {
  return node.type === 'word' && node.value === 'from';
}

namespace detective {
  export interface Options {
    url: boolean;
  }

  export class MalformedCssError extends Error {}
}

export = detective;
