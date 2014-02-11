"use strict";
/**
 * XCSS object model
 */

var stringify = require('css-stringify');
var flatMap   = require('flatmap');

var inheritance = require('./transforms/rule-inheritance');
var cleanup     = require('./transforms/cleanup');
var linearize   = require('./transforms/linearize-imports');

function Stylesheet(vars, rules) {
  this.type = 'stylesheet';
  this.vars = vars;
  this.rules = rules;

  if (process.env.NODE_ENV !== 'production') {
    var deepFreeze  = require('deep-freeze');
    deepFreeze(this);
  }
}

Stylesheet.prototype.transform = function(fn) {
  return fn(this);
}

Stylesheet.prototype.addRule = function(rule) {
  return new Stylesheet(this.vars, this.rules.concat(rule));
}

Stylesheet.prototype.filter = function(fn) {
  return new Stylesheet(this.vars, this.rules.filter(function(rule, i) {
    return fn(rule, i, this);
  }, this));
}

Stylesheet.prototype.filterRules = function(fn) {
  var rules = [];
  for (var i = 0, len = this.rules.length; i < len; i++) {
    var rule = this.rules[i];
    if (typeof rule.filterRules === 'function') {
      rules.push(rule.filterRules(fn));
    } else {
      if (fn(rule, i, this)) rules.push(rule);
    }
  }
  return new Stylesheet(this.vars, rules);
}

Stylesheet.prototype.map = function(fn) {
  return new Stylesheet(this.vars, this.rules.map(function(rule, i) {
    return fn(rule, i, this);
  }, this));
}

Stylesheet.prototype.mapRules = function(fn) {
  var rules = [];
  for (var i = 0, len = this.rules.length; i < len; i++) {
    var rule = this.rules[i];
    rules.push(typeof rule.mapRules === 'function' ? rule.mapRules(fn) : fn(rule, i, this));
  }
  return new Stylesheet(this.vars, rules);
}

Stylesheet.prototype.flatMap = function(fn) {
  return new Stylesheet(this.vars, flatMap(this.rules, function(rule, i) {
    return fn(rule, i, this);
  }, this));
}

Stylesheet.prototype.flatMapRules = function(fn) {
  var rules = flatMap(this.rules, function(rule, i) {
    if (typeof rule.flatMapRules === 'function') {
      return rule.flatMapRules(fn);
    } else  {
      return fn(rule, i, this);
    }
  }, this);
  return new Stylesheet(this.vars, rules);
}

Stylesheet.prototype.toCSS = function(options) {
  var stylesheet = this
    .transform(linearize)
    .transform(inheritance)
    .transform(cleanup);
  return stringify({type: 'stylesheet', stylesheet: stylesheet}, options);
}

Stylesheet.prototype.concat = function(stylesheet) {
  var rules = stylesheet.rules || stylesheet;
  return new Stylesheet(this.vars, this.rules.concat(rules));
}

function Media(media, rules) {
  this.type = 'media';
  this.media = media;
  this.rules = rules;
}

Media.prototype.addRule = function(rule) {
  return new Media(this.media, this.rules.concat(rule));
}

Media.prototype.filter = Media.prototype.filterRules = function(fn) {
  return new Media(this.media, this.rules.filter(function(rule, i) {
    return fn(rule, i, this);
  }, this));
}

Media.prototype.map = Media.prototype.mapRules = function(fn) {
  return new Media(this.media, this.rules.map(function(rule, i) {
    return fn(rule, i, this);
  }, this));
}

Media.prototype.flatMap = Media.prototype.flatMapRules = function(fn) {
  return new Media(this.media, flatMap(this.rules, function(rule, i) {
    return fn(rule, i, this);
  }, this));
}

function Rule(selectors, declarations) {
  this.type = 'rule';
  this.selectors = selectors;
  this.declarations = declarations;
}

Rule.prototype.addSelector = function(selector) {
  var selectors = this.selectors.concat(selector);
  return new Rule(selectors, this.declarations);
}

Rule.prototype.addDeclaration = function(declaration) {
  var declarations = this.declarations.concat(declaration);
  return new Rule(this.selectors, declarations);
}

Rule.prototype.filter = Rule.prototype.filterDeclarations = function(fn) {
  var declarations = this.declarations.filter(function(declaration, i) {
    return fn(declaration, i, this);
  }, this);
  return new Rule(this.selectors, declarations);
}

Rule.prototype.filterSelectors = function(fn) {
  var selectors = this.selectors.filter(function(selector, i) {
    return fn(selector, i, this);
  }, this);
  return new Rule(selectors, this.declarations);
}

Rule.prototype.map = Rule.prototype.mapDeclarations = function(fn) {
  var declarations = this.declarations.map(function(declaration, i) {
    return fn(declaration, i, this);
  }, this);
  return new Rule(this.selectors, declarations);
}

Rule.prototype.mapSelectors = function(fn) {
  var selectors = this.selectors.map(function(selector, i) {
    return fn(selector, i, this);
  }, this);
  return new Rule(selectors, this.declarations);
}

Rule.prototype.flatMap = Rule.prototype.flatMapDeclarations = function(fn) {
  var declarations = flatMap(this.declarations, function(declaration, i) {
    return fn(declaration, i, this);
  }, this);
  return new Rule(this.selectors, declarations);
}

Rule.prototype.flatMapSelectors = function(fn) {
  var selectors = flatMap(this.selectors, function(selector, i) {
    return fn(selector, i, this);
  }, this);
  return new Rule(selectors, this.declarations);
}

function Import(stylesheet) {
  this.type = 'import';
  this.stylesheet = stylesheet;
}

function Extend(selector) {
  this.type = 'extend';
  this.selector = selector;
}

function stylesheet(vars) {
  return new Stylesheet(vars, toArray(arguments).slice(1));
}

function media(condition) {
  return new Media(condition, toArray(arguments).slice(1));
}

function rule() {
  var selectors = [];
  var declarations = [];

  toArray(arguments).forEach(function(arg) {
    if (isString(arg)) {
      if (declarations.length > 0) {
        throw new Error('selector values goes after declaration');
      }
      selectors.push(arg);
    } else {
      if (!arg.type) {
        for (var k in arg) {
          declarations.push({type: 'declaration', property: k, value: arg[k]});
        }
      } else {
        declarations.push(arg);
      }
    }
  });

  return new Rule(selectors, declarations);
}

function imp(stylesheet) {
  return new Import(stylesheet);
}

function extend(selector) {
  return new Extend(selector);
}

function mod(func) {
  func.toCSS = throwError('module should be instantied before CSS can be produced from it');
  func.type = 'module';
  return func;
}

function throwError(msg, cls) {
  cls = cls || Error;
  return function() { throw new Error(msg) };
}

function toArray(o) {
  return Array.prototype.slice.call(o);
}

function isString(o) {
  return Object.prototype.toString.call(o) === '[object String]';
}

module.exports = {
  // classes
  Extend: Extend,
  Import: Import,
  Rule: Rule,
  Stylesheet: Stylesheet,
  Media: Media,

  // factories
  module: mod,
  extend: extend,
  import: imp,
  rule: rule,
  stylesheet: stylesheet,
  media: media
};
