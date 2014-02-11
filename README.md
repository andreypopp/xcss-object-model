# xcss-object-model

An immutable object model for CSS. A part of [xCSS][].

## Installation

Install via npm:

    % npm install xcss-object-model

## Usage

Compose a stylesheet and call `.toCSS()` method to get CSS:

    var xcss = require('xcss-object-model');

    var stylesheet = xcss.stylesheet;
    var rule = xcss.rule;

    var style = stylesheet(null,
      rule('body', {
        backgroundColor: 'red'
      }),

      rule('div', {
        width: '12px'
      })
    )

    var css = style.toCSS();

[xCSS]: https://github.com/andreypopp/xcss
