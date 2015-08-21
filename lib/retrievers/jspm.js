// - retrieve dependencies defined with JSPM
// - retrieve dependencies defined with `System.import('moduleName')`

var assert = require('better-assert');
var acorn = require('acorn');
var acorn_walk = require('acorn/dist/walk');
var Liftoff = require('liftoff');
var path = require('path');
var jspm; // jspm module loaded with Liftoff
var log = require('../log.js');
var Code = require('../code-class.js');


module.exports = [
    handle_jspm,
    handle_systemjs
];


function handle_jspm(code, done){
    assert(code && code.constructor === Code);
    assert(code.type);

    if( code.type !== 'jspm.js'  ) {
        done();
        return;
    }

    assert(code.uri);
    assert(code.base_path);

    get_dependencies(code.uri, code.base_path, function(info){

        code.path = info.path;

        code.dependencies =
            (code.dependencies||[])
            .concat(
                info
                .dependencies_found
                .map(function(code_dependency){
                    return new Code({
                        uri: code_dependency.uri,
                        path: code_dependency.path,
                        type: 'jspm.js',
                        includer: code
                    });
                }));

        done();

    });

    function get_dependencies(uri, base_path, callback){

        // load JSPM
        new Promise(function(resolve){
            if( jspm ) {
                resolve();
                return;
            }

            new Liftoff({
                name: 'jspm',
                configName: 'package',
                extensions: {
                    '.json': null
                }
            })

            .launch({
                cwd: base_path
            }, function(env) {

                // use local install of jspm, if present
                process.env.globalJspm = !env.modulePath;
                if (env.modulePath)
                    jspm = require(env.modulePath);
                else
                    jspm = require('jspm');

                if( env.configBase ) {
                    jspm.setPackagePath(env.configBase);
                }

                resolve();

            });

        })

        // normalize uri
        .then(function(){
            return jspm.normalize(uri);
        })
        .then(function(path){
            return {
                normalized: path
            };
        })

        // get dependency tree
        .then(function(info){
            return new Promise(function(resolve, reject){
                new jspm.Builder()
                    .trace(uri)
                    .catch(function(err){
                        log.warn("can't compute dependency tree with JSPM of `"+info.normalized+"` ["+err+"]");
                        return {};
                    })
                    .then(function(tree){
                        info.tree = tree;
                        resolve(info);
                    });
            });
        })

        // normalize key of dependency tree
        .then(function(info){

            info.tree_normalized = {};
            for(var key in info.tree){
                var key_normalized = info.tree[key].normalized;
                info.tree_normalized[key_normalized] = info.tree[key];
            }
            return info;

        })

        // get dependencies
        .then(function(info){

            var code__jspm = info.tree_normalized[info.normalized];

            assert(!code__jspm || code__jspm.deps);

            var dependencies_found =
                (
                    (code__jspm||{}).deps || []
                )
                .map(function(uri_relative){
                    assert(uri_relative);
                    var uri = code__jspm.depMap[uri_relative];
                    assert(uri);
                    assert(info.tree[uri] && info.tree[uri].normalized);
                    return {
                        uri: uri,
                        path: prune_protocol(info.tree[uri].normalized)
                    }
                });

            callback({
                path: prune_protocol(info.normalized),
                dependencies_found: dependencies_found
            });

            function prune_protocol(path){
                return path.replace(/^file:\/*(?=\/)/,'');
            }

        })
    }
}


function handle_systemjs(code, done){
    assert(code && code.constructor === Code);
    assert(code.type);

    if( code.type !== 'js' || !code.source_code ) {
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
}




