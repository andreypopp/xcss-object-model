"use strict";

/* jshint ignore:start */
var fmap = require('flatmap');

function makeContainer(singular) {
  var Singular = singular.charAt(0).toUpperCase() + singular.slice(1);
  var plural = singular + 's';
  var Plural = plural.charAt(0).toUpperCase() + plural.slice(1);
  var copier = 'with' + Plural;

  function add(item) {
    return this[copier](this[plural].concat(item));
  }

  function filter(fn) {
    return this[copier](this[plural].filter(function(item, i) {
      return fn(item, i, this);
    }, this));
  }

  function map(fn) {
    return this[copier](this[plural].map(function(item, i) {
      return fn(item, i, this);
    }, this));
  }

  function flatMap(fn) {
    return this[copier](fmap(this[plural], function(item, i) {
      return fn(item, i, this);
    }, this));
  }

  var Container = {
    add: add,
    filter: filter,
    map: map,
    flatMap: flatMap,
    WithSuffix: {}
  };

  Container.WithSuffix['add' + Singular] = add;
  Container.WithSuffix['filter' + Plural] = filter;
  Container.WithSuffix['map' + Plural] = map;
  Container.WithSuffix['flatMap' + Plural] = flatMap;

  return Container;
}

module.exports = makeContainer;
/* jshint ignore:end */
