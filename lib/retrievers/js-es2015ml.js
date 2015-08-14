// retrieve dependencies defined with `System.import()`


var assert = require('better-assert');
var acorn = require('acorn');
var acorn_walk = require('acorn/dist/walk');


module.exports = function(code, done) {

    var Code = require('../code-class.js');

    assert(code && code.constructor === Code);
    assert(code.type);

    if( code.type !== 'js' ||
        ! code.source_code ) {
        done();
        return;
    }

    get_dependencies(code.source_code, function(dependencies_found){

        code.dependencies =
            (code.dependencies||[])
            .concat(
                dependencies_found
                .map(function(uri){
                    return new Code({
                        uri: uri,
                        type: 'jspm.js',
                        includer: code
                    });
                }));

        done();

    });

}


function get_dependencies(source_code, callback){
    var dependencies_found = [];

    var ast = acorn.parse(source_code);
    acorn_walk.simple(ast, {
        CallExpression: function(node){
            if( (node.callee.object||{}).name === "System" &&
                (node.callee.property||{}).name === "import" ) {
                var uri = node.arguments[0].value;
                assert(uri);
                dependencies_found.push(uri);
            }
        }
    });

    callback(dependencies_found);
}
