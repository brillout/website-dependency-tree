// - retrieve dependencies defined with JSPM
// - retrieve dependencies defined with `System.import('moduleName')`

var assert = require('better-assert');
var acorn = require('acorn');
var acorn_walk = require('acorn/dist/walk');
var Liftoff = require('liftoff');
var path = require('path');
var jspm; // jspm module loaded with Liftoff
var log = require('mini-log');
var CodeInfo = require('../../code-class.js');


module.exports = [
    handle_jspm,
    handle_systemjs
];


function handle_jspm(code, done){
    assert(code && code.constructor === CodeInfo);

    if( ! code.mime_type ||
        code.mime_type !== 'application/javascript' ||
        code.module_format !== 'jspm'
        ) {
        done();
        return;
    }

    assert(code.last_inclusion.uri);
    assert(code.location.disk.directory);

    get_dependees(
        code.last_inclusion.uri,
        code.location.disk.directory,
        function(dependees_found){

            code.dependees =
                (code.dependees||[])
                .concat(
                    dependees_found
                    .map(function(dependee_info){
                        return new CodeInfo({
                            mime_type: 'application/javascript',
                            module_format: 'jspm',
                            location: {
                                disk: {
                                    path: dependee_info.path
                                }
                            },
                            last_inclusion: {
                                uri: dependee_info.uri,
                                depender: code
                            }
                        });
                    }));

            done();

        });


    function get_dependees(uri, directory, callback){

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

            info.denormalize_map = {};
            var keys = Object.keys(info.tree);
            return Promise.all(
                keys
                .map(function(key){
                    return jspm.normalize(key);
                })
            )
            .then(function(normalized_keys){
                for(var i in normalized_keys) {
                    var key = keys[i];
                    var key_normalized = normalized_keys[i];
                    info.denormalize_map[key_normalized] = key;
                    info.tree[key].normalized = key_normalized;
                }
                return info;
            });

        })

        // get dependees
        .then(function(info){

            var code__jspm = info.tree[info.denormalize_map[info.normalized]];

            assert(!code__jspm || code__jspm.deps);

            var dependees_found =
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

            callback(dependees_found);


        })
    }
}


function handle_systemjs(code, done){
    assert(code && code.constructor === CodeInfo);

    if( ! code.mime_type ||
        code.mime_type !== 'application/javascript' ||
        code.module_format === 'jspm' ||
        ! code.source_code ||
        ! code.location.disk.directory // can't handle websites on the internet
        ) {
        done();
        return;
    }

    get_dependees(
        code.id,
        code.source_code.toString('utf8'),
        code.location.disk.directory,
        function(dependees_found){

            code.dependees =
                (code.dependees||[])
                .concat(
                    dependees_found
                    .map(function(dependee_info){
                        return new CodeInfo({
                            mime_type: 'application/javascript',
                            module_format: 'jspm',
                            location: {
                                disk: {
                                    path: dependee_info.path
                                }
                            },
                            last_inclusion: {
                                uri: dependee_info.uri,
                                depender: code
                            }
                        });
                    }));

            done();

        });


    function get_dependees(id, source_code, directory, callback){
        var dependees_found = [];

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
                            log.warn("System.import called without any argument in `"+id+"`");
                            return;
                        }
                        if( arg.type !== 'Literal' ) {
                            log.warn("Can't retrieve dependency dynamically defined with System.import in `"+id+"`");
                            return;
                        }

                        var uri = arg.value;
                        assert(uri);
                        dependees_found.push(uri);
                    }
                }
            });
        }

        if( dependees_found.length >= 1 ) {
            load_jspm_module(directory)
            .then(function(){
                return Promise.all(
                    dependees_found
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
            .then(function(dependees_found__all){
                callback(dependees_found__all);
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

            if (env.modulePath) {
                jspm = require(env.modulePath);
                process.env.globalJspm = true;
            }
            else {
                jspm = require('jspm');
                process.env.globalJspm = false;
            }

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
