"use strict";
/**
 * Cleanup transform.
 *
 * Remove placeholders and empty rules
 */

module.exports = function(stylesheet) {
  return stylesheet
    .mapRules(removePlaceholderSelectors)
    .filterRules(function(rule) {
      var isRule = rule.type === 'rule';
      return !isRule || isRule && rule.selectors.length > 0 && rule.declarations.length > 0;
    });
}

function removePlaceholderSelectors(rule) {
  return rule.filterSelectors ? 
    rule.filterSelectors(function(selector){return !/%[a-zA-Z]/.exec(selector)}) :
    rule;
}
