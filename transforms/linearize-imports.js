"use strict";
/**
 * Linearize stylesheet hieratchy by inlining imports.
 */

module.exports = function linearize(stylesheet, seen) {
  seen = seen || [];
  return stylesheet.flatMapRules(function(rule) {
    if (rule.type === 'importModule') {
      if (seen.indexOf(rule.stylesheet) > -1) return [];
      seen.push(rule.stylesheet);
      return linearize(rule.stylesheet, seen).rules;
    }
    return rule;
  });
}
