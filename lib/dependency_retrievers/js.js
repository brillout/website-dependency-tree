var assert = require('better-assert');
var acorn = require('acorn');
var acorn_walk = require('acorn/dist/walk');

var Code = require('../code-class.js');


module.exports = function(code, callback) {

    assert(code && code.constructor === Code);
    assert(code.source_code);

    var dependencies_found = [];

    //if( /system|config/.test(code.uri) ) return dependencies_found;

    var ast = acorn.parse(code.source_code);
    acorn_walk.simple(ast, {
        CallExpression: function(node){
            if( (node.callee.object||{}).name === "System" &&
                (node.callee.property||{}).name === "import" ) {
                var uri = node.arguments[0].value;
                assert(uri);
                dependencies_found.push(new Code({
                    uri: uri,
                    filename_extension: 'jspm.js',
                    includer: code
                }));
            }
        }
    });

    callback(dependencies_found);
}
