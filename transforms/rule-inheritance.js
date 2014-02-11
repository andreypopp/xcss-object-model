"use strict";
/**
 * Rule inheritance transform.
 */

var collections = require('es6-collections');

module.exports = function(stylesheet) {
  var index = {};
  var changeset = new collections.Map();

  function storeIndex(k, v) {
    (index[k] || (index[k] = [])).push(v);
  }

  stylesheet.mapRules(function(rule, _index, parent) {
    if (rule.type === 'rule') {
      var seenExtend = false;

      // add rule to index
      // TODO: handle complex selectors, like .a > .b and so
      rule.selectors.forEach(function(selector) {
        storeIndex(selector, {rule: rule, parent: parent});
      });

      // process extends
      rule.declarations.forEach(function(decl) {
        if (decl.type !== 'extend') {
          return;
        }

        seenExtend = true;
        var extendables = index[decl.selector];
        if (!extendables) {
          throw new Error("cannot extend " + decl.selector);
        }
        extendables.forEach(function(extendable) {
          var extendedRule = changeset.get(extendable.rule) || extendable.rule;

          // extend from outside media
          if (parent.type === 'media' && extendable.parent.type !== 'media') {
            changeset.set(
              rule,
              (changeset.get(rule) || rule).addDeclaration(extendedRule.declarations)
            );
          // extend from inside media
          } else if (parent !== extendable.parent && extendable.parent.type === 'media') {
            changeset.set(
              extendable.parent,
              (changeset.get(extendable.parent) || extendable.parent).addRule(rule)
            );
            changeset.set(
              extendable.rule,
              extendedRule.addSelector(rule.selectors)
            );
          } else {
            changeset.set(
              extendable.rule,
              extendedRule.addSelector(rule.selectors)
            );
          }

          // add extendable rule to the index for the extended rule selectors
          // so we enable chaining
          // TODO: handle complex selectors, like .a > .b and so
          rule.selectors.forEach(function(selector) {
            storeIndex(selector, extendable);
          });
        });
      });

      if (seenExtend) {
        changeset.set(rule, (changeset.get(rule) || rule).filter(function(d) {return d.type !== 'extend'}));
      }
    }
  });

  function update(rule) {
    return changeset.get(rule) || rule;
  }

  return stylesheet.map(function(rule) {
    var rule = update(rule);
    return (typeof rule.mapRules === 'function') ? rule.mapRules(update) : rule;
  });
}
