import * as d from 'debug';
import { parse, AtRule } from 'postcss';
import * as postCssValuesParser from 'postcss-values-parser';
import isUrl = require('is-url');

const debug = d('detective-postcss');

export default function(src) {
    const references = [];
    const root = parse(src);
    root.walkAtRules(rule => {
        let file = null;
        if (isImportRule(rule)) {
            const firstNode = postCssValuesParser(rule.params).parse().first
                .first;
            file = getValueOrUrl(firstNode);
            if (file) {
                debug(`found %s of %s`, '@import', file);
            }
        }
        if (isValueRule(rule)) {
            const lastNode = postCssValuesParser(rule.params).parse().first
                .last;
            file = getValueOrUrl(lastNode);
            if (file) {
                debug(`found %s of %s`, '@value with import', file);
            }
        }
        file && references.push(file);
    });
    return references;
}

function getValueOrUrl(node: postCssValuesParser.Node) {
    let ret;
    if (node.type === 'func' && node.value === 'url') {
        ret = node.nodes[1].value;
    } else {
        ret = node.value;
    }
    return isUrl(ret) ? undefined : ret;
}

function isValueRule(rule: AtRule) {
    return rule.name === 'value';
}

function isImportRule(rule: AtRule) {
    return rule.name === 'import';
}
