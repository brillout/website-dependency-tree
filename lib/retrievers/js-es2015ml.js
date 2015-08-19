// retrieve dependencies defined with `System.import()`


var assert = require('better-assert');
var acorn = require('acorn');
var acorn_walk = require('acorn/dist/walk');
var log = require('../log.js');


module.exports = function(code, done) {

    var Code = require('../code-class.js');

    assert(code && code.constructor === Code);
    assert(code.type);

    if( code.type !== 'js' ||
        ! code.source_code ) {
        done();
        return;
    }

    get_dependencies(code.id, code.source_code, function(dependencies_found){

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


function get_dependencies(id, source_code, callback){
    var dependencies_found = [];

    var ast;
    try{
        ast = acorn.parse(source_code);
    }
    catch(e){
        log.warn("couldn't parse `"+id+"`");
    }

    if( ast ) {
        acorn_walk.simple(ast, {
            CallExpression: function(node){
                if( (node.callee.object||{}).name === "System" &&
                    (node.callee.property||{}).name === "import" ) {
                    var arg = node.arguments[0];

                    if( !arg ) {
                        log.warn("System.import called without any argument at `"+id+"`");
                        return;
                    }
                    if( arg.type !== 'Literal' ) {
                        log.warn("couldn't retrieve dynamic dependency loaded with System.import at `"+id+"`");
                        return;
                    }

                    var uri = arg.value;
                    assert(uri);
                    dependencies_found.push(uri);
                }
            }
        });
    }

    callback(dependencies_found);
}
