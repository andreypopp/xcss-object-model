"use strict";
/**
 * Cleanup transform.
 *
 * Remove placeholders and empty rules
 */

module.exports = function(stylesheet) {
  return stylesheet
    .map(removePlaceholderSelectors)
    .filter(function(rule) {
      return rule.selectors.length > 0 && rule.declarations.length > 0;
    });
}

function removePlaceholderSelectors(rule) {
  return rule.filterSelectors(function(selector){
    return !/%[a-zA-Z]/.exec(selector);
  });
}
