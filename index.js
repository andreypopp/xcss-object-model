"use strict";
/**
 * XCSS object model
 */

var stringify = require('css-stringify');
var assign    = require('lodash').assign;

var makeContainer   = require('./container');
var RuleList        = makeContainer('rule');
var DeclarationList = makeContainer('declaration');
var KeyframeList    = makeContainer('keyframe');
var SelectorList    = makeContainer('selector');

var makeNestedContainer = require('./nested-container');
var NestedRuleList      = makeNestedContainer('rule');

var inheritance     = require('./transforms/rule-inheritance');
var cleanup         = require('./transforms/cleanup');
var linearize       = require('./transforms/linearize-imports');

function Stylesheet(vars, rules) {
  this.type = 'stylesheet';
  this.vars = vars;
  this.rules = rules;

  if (process.env.NODE_ENV !== 'production') {
    var deepFreeze  = require('deep-freeze');
    deepFreeze(this);
  }
}

assign(Stylesheet.prototype, RuleList, NestedRuleList.WithSuffix, {

  withRules: function(rules) {
    return new Stylesheet(this.vars, rules);
  },

  concat: function(stylesheet) {
    var rules = stylesheet.rules || stylesheet;
    return new Stylesheet(this.vars, this.rules.concat(rules));
  },

  transform: function(fn, options) {
    return fn(this, options);
  },

  toCSS: function(options) {
    var stylesheet = this
      .transform(linearize)
      .transform(inheritance)
      .transform(cleanup);
    return stringify({type: 'stylesheet', stylesheet: stylesheet}, options);
  }
});

function Media(media, rules) {
  this.type = 'media';
  this.media = media;
  this.rules = rules;
}

assign(Media.prototype, RuleList, RuleList.WithSuffix, {

  withRules: function(rules) {
    return new Media(this.media, rules);
  }
});

function Supports(supports, rules) {
  this.type = 'supports';
  this.supports = supports;
  this.rules = rules;
}

assign(Supports.prototype, RuleList, RuleList.WithSuffix, {

  withRules: function(rules) {
    return new Supports(this.supports, rules);
  }
});

function Document(document, rules, vendor) {
  this.type = 'document';
  this.document = document;
  this.rules = rules;
  this.vendor = vendor;
}

assign(Document.prototype, RuleList, RuleList.WithSuffix, {

  withRules: function(rules) {
    return new Document(this.document, rules, this.vendor);
  }
});

function Host(rules) {
  this.type = 'host';
  this.rules = rules;
}

assign(Host.prototype, RuleList, RuleList.WithSuffix, {

  withRules: function(rules) {
    return new Host(rules);
  }
});

function Keyframes(name, keyframes, vendor) {
  this.type = 'keyframes';
  this.name = name;
  this.keyframes = keyframes;
  this.vendor = vendor;
}

assign(Keyframes.prototype, KeyframeList, KeyframeList.WithSuffix, {

  withKeyframes: function(keyframes) {
    return new Keyframes(this.name, keyframes, this.vendor);
  }
});

function Rule(selectors, declarations) {
  this.type = 'rule';
  this.selectors = selectors;
  this.declarations = declarations;
}

assign(Rule.prototype, SelectorList.WithSuffix, DeclarationList, DeclarationList.WithSuffix, {

  withDeclarations: function(declarations) {
    return new Rule(this.selectors, declarations);
  },

  withSelectors: function(selectors) {
    return new Rule(selectors, this.declarations);
  }
});

function Page(selectors, declarations) {
  this.type = 'page';
  this.selectors = selectors;
  this.declarations = declarations;
}

assign(Page.prototype, SelectorList.WithSuffix, DeclarationList, DeclarationList.WithSuffix, {

  withDeclarations: function(declarations) {
    return new Page(this.selectors, declarations);
  },

  withSelectors: function(selectors) {
    return new Page(selectors, this.declarations);
  }
});

function Keyframe(values, declarations) {
  this.type = 'keyframe';
  this.values = values;
  this.declarations = declarations;
}

assign(Keyframe.prototype, DeclarationList, DeclarationList.WithSuffix, {

  withDeclarations: function(declarations) {
    return new Keyframe(this.values, declarations);
  }
});

function stylesheet(vars) {
  return new Stylesheet(vars, toArray(arguments).slice(1));
}

function media(condition) {
  return new Media(condition, toArray(arguments).slice(1));
}

function supports(sup) {
  return new Supports(sup, toArray(arguments).slice(1));
}

function document(doc) {
  return new Document(doc, toArray(arguments).slice(1));
}

function host() {
  return new Host(toArray(arguments));
}

function keyframes(name) {
  return new Keyframes(name, toArray(arguments).slice(1));
}

function importReference(imp) {
  return {type: 'import', import: imp};
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

function page() {
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

  return new Page(selectors, declarations);
}

function keyframe() {
  var values = [];
  var declarations = [];

  toArray(arguments).forEach(function(arg) {
    if (isString(arg)) {
      if (declarations.length > 0) {
        throw new Error('keyframe values goes after declaration');
      }
      values.push(arg);
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

  return new Rule(values, declarations);
}

function imp(stylesheet) {
  return {type: 'importModule', stylesheet: stylesheet};
}

function charset(cset) {
  return {type: 'charset', charset: cset};
}

function namespace(ns) {
  return {type: 'namespace', namespace: ns};
}

function extend(selector) {
  return {type: 'extend', selector: selector};
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
  module: mod,
  extend: extend,
  import: imp,
  importReference: importReference,
  charset: charset,
  rule: rule,
  stylesheet: stylesheet,
  media: media,
  document: document,
  host: host,
  namespace: namespace,
  keyframe: keyframe,
  keyframes: keyframes,
  page: page,
  supports: supports
};
