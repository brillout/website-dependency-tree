// retrieve dependencies defined with JSPM


var assert = require('better-assert');
var Liftoff = require('liftoff');
var path = require('path');
var log = require('../log.js');
var jspm; // jspm module loaded with Liftoff


module.exports = function(code, done){

    var Code = require('../code-class.js');

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

}


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
