import { debuglog } from 'util';
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
import isUrl = require('is-url');

const debug = debuglog('detective-postcss');

function detective(src, options: detective.Options = { url: false }) {
  let references = [];
  let root;
  try {
    root = parse(src);
  } catch {
    throw new detective.MalformedCssError();
  }

  root.walkAtRules((rule) => {
    let file = null;
    if (isImportRule(rule)) {
      const firstNode = parseValue(rule.params).first;
      file = getValueOrUrl(firstNode);
      if (file) {
        debug('found %s of %s', '@import', file);
      }
    }

    if (isValueRule(rule)) {
      const lastNode = parseValue(rule.params).last;
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
          debug('found %s of %s', 'url() with import', file);
        }
      }
    }

    if (file) references.push(file);
  });

  if (options.url) {
    root.walkDecls((decl) => {
      const { nodes } = parseValue(decl.value);
      const files = nodes.filter(isUrlNode).map(getValueOrUrl);
      if (files) {
        for (const file of files) {
          debug('found %s of %s', 'url() with import', file);
        }

        references = references.concat(files);
      }
    });
  }

  return references;
}

function parseValue(value: string) {
  return postCssParseValue(value);
}

function getValueOrUrl(node: ChildNode) {
  let ret;
  if (isUrlNode(node)) {
    // ['file']
    const innerNode = node.nodes[0];
    ret = getValue(innerNode);
  } else {
    ret = getValue(node);
  }

  // is-url sometimes gets data: URLs wrong
  return !isUrl(ret) && !ret.startsWith('data:') && ret;
}

function getValue(node: ChildNode) {
  if (!isNodeWithValue(node)) {
    throw new Error('Unexpectedly found a node without a value');
  }

  if (node.type === 'quoted') {
    return node.contents;
  }

  return node.value;
}

function isNodeWithValue(
  node: ChildNode,
): node is Word | Numeric | Operator | Punctuation | Quoted {
  return (
    node.type === 'word' ||
    node.type === 'numeric' ||
    node.type === 'operator' ||
    node.type === 'punctuation' ||
    node.type === 'quoted'
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
