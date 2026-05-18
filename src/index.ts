import { debuglog } from 'node:util';
import isUrl from 'is-url-superb';
import { parse, type Root } from 'postcss';
import {
  parse as postCssParseValue,
  Word,
  Quoted,
  type Node as ValueNode,
} from 'postcss-values-parser';

const debug = debuglog('detective-postcss');

export class MalformedCssError extends Error {}

export interface Options {
  url?: boolean;
}

interface ParsedValue {
  first: ValueNode | undefined;
  last: ValueNode | undefined;
  nodes: ValueNode[];
}

function detective(src: string, options: Options = { url: false }): string[] {
  let root: Root;

  try {
    root = parse(src);
  } catch {
    throw new MalformedCssError();
  }

  const references: string[] = [];

  root.walkAtRules((rule) => {
    if (rule.name === 'import') {
      handleImport(rule.params, references);
    } else if (rule.name === 'value') {
      handleValueRule(rule.params, options, references);
    }
  });

  if (options.url) {
    root.walkDecls((decl) =>
      collectUrls(decl.value, 'url() in declaration', references),
    );
  }

  return references;
}

function handleImport(params: string, refs: string[]): void {
  const path = pathFromNode(firstImportNode(params));
  if (!path) return;

  debug('found %s of %s', '@import', path);

  refs.push(path);
}

function handleValueRule(
  params: string,
  options: Options,
  refs: string[],
): void {
  const parsed = tryParse(params);

  // Parse failed (simple def like `@value mine: #fff`). If url option is on,
  // still try to extract url() refs from the value part after the colon.
  if (!parsed) {
    if (!options.url) return;

    const colonIdx = params.indexOf(':');
    if (colonIdx === -1) return;

    collectUrls(params.slice(colonIdx + 1), 'url() in @value', refs);

    return;
  }

  const last = parsed.last;
  if (!last) return;

  if (isFrom(last.prev())) {
    const path = pathFromNode(last);
    if (!path) return;

    debug('found %s of %s', '@value with import', path);

    refs.push(path);
    return;
  }

  if (options.url && isUrlNode(last)) {
    const path = pathFromNode(last);
    if (!path) return;

    debug('found %s of %s', 'url() in @value', path);

    refs.push(path);
  }
}

function collectUrls(value: string, label: string, refs: string[]): void {
  const parsed = tryParse(value);
  if (!parsed) return;

  for (const node of parsed.nodes) {
    if (!isUrlNode(node)) continue;

    const path = pathFromNode(node);
    if (!path) continue;

    debug('found %s of %s', label, path);

    refs.push(path);
  }
}

function tryParse(value: string): ParsedValue | undefined {
  try {
    const r = postCssParseValue(value);
    return {
      first: r.first as unknown as ValueNode | undefined,
      last: r.last as unknown as ValueNode | undefined,
      nodes: (r.nodes ?? []) as unknown as ValueNode[],
    };
  } catch {
    return undefined;
  }
}

function firstImportNode(params: string): ValueNode | undefined {
  const parsed = tryParse(params);
  if (parsed?.first) return parsed.first;

  // params may include a media query list after the path token
  const t = params.trim();
  const q = t[0];
  let token: string | undefined;

  if (q === '"' || q === "'") {
    const end = t.indexOf(q, 1);
    if (end !== -1) {
      token = t.slice(0, end + 1);
    }
  } else if (/^url\s*\(/i.test(t)) {
    const end = t.indexOf(')');
    if (end !== -1) {
      token = t.slice(0, end + 1);
    }
  }

  return token ? tryParse(token)?.first : undefined;
}

function pathFromNode(node: ValueNode | undefined): string | false {
  if (!node) return false;

  const raw = node instanceof Quoted ? node.contents : node.value;
  if (!raw) return false;

  // is-url-superb uses new URL() which doesn't accept protocol-relative URLs;
  // prepend http: so they get correctly identified and filtered out
  return !isUrl(raw.startsWith('//') ? `http:${raw}` : raw) && raw;
}

// In v7.0.1, url() is parsed as a Word (not Func). The Word's source offsets
// span the full original url(...) token, so we detect url() origin by the span.
function isUrlNode(node: unknown): node is Word {
  if (!(node instanceof Word)) return false;

  const src = node.source?.input?.css;
  const start = node.source?.start?.offset;
  const end = node.source?.end?.offset;

  if (src == null || start == null || end == null) return false;

  return /^url\s*\(/i.test(src.slice(start, end));
}

function isFrom(node: unknown): node is Word {
  return node instanceof Word && node.value === 'from';
}

detective.MalformedCssError = MalformedCssError;

export default detective;
