// retrieve dependencies defined with JSPM


var assert = require('better-assert');
var Liftoff = require('liftoff');
var path = require('path');
var jspm; // jspm module loaded with Liftoff

module.exports = function(code, done){

    var Code = require('../code-class.js');

    assert(code && code.constructor === Code);
    assert(code.type);

    if( code.type !== 'jspm.js'  ) {
        done();
        return;
    }

    get_dependencies(code.uri, function(info){

        console.log(code.uri, info);
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


function get_dependencies(uri, callback){

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

        .launch({}, function(env) {

            // use local install of jspm
            process.env.globalJspm = !env.modulePath;
            if (env.modulePath)
                jspm = require(env.modulePath);
            else
                jspm = require('jspm');

            if( env.configBase ) {
                jspm.setPackagePath(env.configBase)
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
        return new Promise(function(resolve){
            new jspm.Builder()
                .trace(uri)
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
            info.tree_normalized[info.tree[key].normalized] = info.tree[key];
        }
        return info;

        // var keys_normalized = {};
        // return Promise.all(
        //     Object.keys(tree).map(function(key){
        //         return jspm.normalize(key)
        //             .then(function(key_normlized){
        //                 keys_normalized[key] = key_normlized;
        //             });
        //     }))
        //     .then(function(){
        //         var tree_normalized = {};
        //         for(var key in tree)
        //             tree_normalized[keys_normalized[key]] = tree[key];
        //         return tree_normalized;
        //     });

    })

    // get dependencies
    .then(function(info){

        var code__jspm = info.tree_normalized[info.normalized];

        assert(code__jspm);
        assert(code__jspm.deps);

        var dependencies_found =
            code__jspm
            .deps
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

    .catch(function(err){console.error(err.stack || err)})
}
