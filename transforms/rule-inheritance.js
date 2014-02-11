"use strict";
/**
 * Rule inheritance transform.
 */

var Map = require('es6-collections').Map;

module.exports = function(stylesheet) {
  var index = {};
  var changeset = new Map();

  function storeIndex(k, v) {
    (index[k] || (index[k] = [])).push(v);
  }

  stylesheet.mapRules(function(rule) {
    if (rule.type === 'rule') {
      var seenExtend = false;

      // add rule to index
      // TODO: handle complex selectors, like .a > .b and so
      rule.selectors.forEach(function(selector) {
        storeIndex(selector, rule);
      });

      // process extends
      rule.declarations.forEach(function(decl) {
        if (decl.type === 'extend') {
          seenExtend = true;
          var extendables = index[decl.selector];
          if (!extendables) {
            throw new Error("cannot extend " + decl.selector);
          }
          extendables.forEach(function(extendable) {
            var extendedRule = changeset.get(extendable) || extendable;

            // add extendable rule to the index for the extended rule selectors
            // so we enable chaining
            // TODO: handle complex selectors, like .a > .b and so
            rule.selectors.forEach(function(selector) {
              storeIndex(selector, extendable);
            });

            changeset.set(extendable, extendedRule.addSelector(rule.selectors));
          });
        }
      });

      if (seenExtend) {
        changeset.set(rule, (changeset.get(rule) || rule).filter(function(d) {return d.type !== 'extend'}));
      }
    }
  });

  return stylesheet.mapRules(function(rule) {
    return changeset.get(rule) || rule;
  });
}
