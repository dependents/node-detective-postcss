import * as d from 'debug';
import { parse, AtRule } from 'postcss';
import * as postCssValuesParser from 'postcss-values-parser';
import isUrl = require('is-url');

const debug = d('detective-postcss');

namespace detective {
    export interface Options {
        url: boolean;
    }
}

function detective(src, options: detective.Options = { url: false }) {
    let references = [];
    const root = parse(src);
    root.walkAtRules(rule => {
        let file = null;
        if (isImportRule(rule)) {
            const firstNode = parseValue(rule.params).first;
            file = getValueOrUrl(firstNode);
            if (file) {
                debug(`found %s of %s`, '@import', file);
            }
        }
        if (isValueRule(rule)) {
            const lastNode = parseValue(rule.params).last;
            if (isFrom(lastNode.prev())) {
                file = getValueOrUrl(lastNode);
                if (file) {
                    debug(`found %s of %s`, '@value with import', file);
                }
            }
        }
        file && references.push(file);
    });
    if (options.url) {
        root.walkDecls(decl => {
            const { nodes } = parseValue(decl.value);
            references = references.concat(
                nodes.filter(isUrlNode).map(getValueOrUrl)
            );
        });
    }
    return references;
}

function parseValue(value: string) {
    return postCssValuesParser(value).parse().first;
}

function getValueOrUrl(node: postCssValuesParser.Node) {
    let ret;
    if (isUrlNode(node)) {
        // ['(', 'file', ')']
        ret = node.nodes[1].value;
    } else {
        ret = node.value;
    }
    return !isUrl(ret) && ret;
}

function isUrlNode(node: postCssValuesParser.Node) {
    return node.type === 'func' && node.value === 'url';
}

function isValueRule(rule: AtRule) {
    return rule.name === 'value';
}

function isImportRule(rule: AtRule) {
    return rule.name === 'import';
}

function isFrom(node: postCssValuesParser.Node) {
    return node.type == 'word' && node.value === 'from';
}

export = detective;
