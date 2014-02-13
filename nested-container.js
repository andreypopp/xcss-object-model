"use strict";

/* jshint ignore:start */
var fmap = require('flatmap');

function makeNestedContainer(singular) {
  var Singular = singular.charAt(0).toUpperCase() + singular.slice(1);
  var plural = singular + 's';
  var Plural = plural.charAt(0).toUpperCase() + plural.slice(1);
  var copier = 'with' + Plural;
  var mapFn = 'map' + Plural;
  var filterFn = 'filter' + Plural;
  var flatMapFn = 'flatMap' + Plural;

  function add(item) {
    var items = this[plural].concat(item);
    return this[copier](items);
  }

  function filter(fn) {
    var items = [];
    for (var i = 0, len = this[plural].length; i < len; i++) {
      var item = this[plural][i];
      if (item[plural]) {
        items.push(item[filterFn](fn));
      } else {
        if (fn(item, i, this)) items.push(item);
      }
    }
    return this[copier](items);
  }

  function map(fn) {
    var items = [];
    for (var i = 0, len = this[plural].length; i < len; i++) {
      var item = this[plural][i];
      items.push(item[plural] ? item[mapFn](fn) : fn(item, i, this));
    }
    return this[copier](items);
  }

  function flatMap(fn) {
    var items = fmap(this[plural], function(item, i) {
      if (item[plural]) {
        return item[flatMapFn](fn);
      } else  {
        return fn(item, i, this);
      }
    }, this);
    return this[copier](items);
  }

  var NestedContainer = {
    add: add,
    filter: filter,
    map: map,
    flatMap: flatMap,
    WithSuffix: {}
  };

  NestedContainer.WithSuffix['add' + Singular] = add;
  NestedContainer.WithSuffix['filter' + Plural] = filter;
  NestedContainer.WithSuffix['map' + Plural] = map;
  NestedContainer.WithSuffix['flatMap' + Plural] = flatMap;

  return NestedContainer;
}

module.exports = makeNestedContainer;
/* jshint ignore:end */
