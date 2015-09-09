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

    if( ! code.mime_type ||
        code.mime_type !== 'application/javascript' ||
        code.module_loader !== 'jspm'
        ) {
        done();
        return;
    }

    assert(code.location.uri);
    assert(code.location.disk.directory);

    get_dependencies(
        code.location.uri,
        code.location.disk.directory,
        function(dependencies_found){

            code.dependencies =
                (code.dependencies||[])
                .concat(
                    dependencies_found
                    .map(function(code_dependency){
                        return new Code({
                            location: {
                                uri: code_dependency.uri,
                                path: code_dependency.path
                            },
                            mime_type: 'application/javascript',
                            module_loader: 'jspm',
                            includer: code
                        });
                    }));

            done();

        });


    function get_dependencies(uri, directory, callback){

        load_jspm_module(directory)

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
                        path: prune_file_protocol(info.tree[uri].normalized)
                    }
                });

            callback(dependencies_found);


        })
    }
}


function handle_systemjs(code, done){
    assert(code && code.constructor === Code);

    if( ! code.mime_type ||
        code.mime_type !== 'application/javascript' ||
        code.module_loader === 'jspm' ||
        ! code.source_code ||
        ! code.location.disk.directory // can't handle websites on the internet
        ) {
        done();
        return;
    }

    get_dependencies(
        code.id,
        code.source_code,
        code.location.disk.directory,
        function(dependencies_found){

            code.dependencies =
                (code.dependencies||[])
                .concat(
                    dependencies_found
                    .map(function(code_info){
                        return new Code({
                            location: {
                                uri: code_info.uri,
                                path: code_info.path
                            },
                            mime_type: 'application/javascript',
                            module_loader: 'jspm',
                            includer: code
                        });
                    }));

            done();

        });


    function get_dependencies(id, source_code, directory, callback){
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

        if( dependencies_found.length >= 1 ) {
            load_jspm_module(directory)
            .then(function(){
                return Promise.all(
                    dependencies_found
                    .map(function(uri){
                        return (
                            jspm
                            .normalize(uri)
                            .catch(function(err){
                                log.err(err);
                            })
                            .then(function(path){
                                return {
                                    uri: uri,
                                    path: prune_file_protocol(path)
                                };
                            }));
                    })
                );
            })
            .then(function(dependencies_found__all){
                callback(dependencies_found__all);
            })
        }
        else {
            callback([]);
        }

    }
}


function load_jspm_module(directory){
    return new Promise(function(resolve){
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
            cwd: directory
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
}

function prune_file_protocol(path){
    return path.replace(/^file:\/*(?=\/)/,'');
}
