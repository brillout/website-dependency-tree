var assert = require('better-assert');
var jspm = require('jspm');

var Code = require('../code-class.js');


var systemBuilder = new jspm.Builder();

module.exports = function(code, callback){
    Promise
    .resolve()
    .then(function(){
        return System.normalize(code.uri);
    })
    .then(function(path){
        console.log(code.uri, path);
        code.path = path;
    })
    .then(function(){
        return systemBuilder.trace(code.uri);
    })
    .then(function(tree){

        var tree_normalized = {};
        for(var key in tree){
            tree_normalized[tree[key].normalized] = tree[key];
        }
        return tree_normalized;
        /*
        var keys_normalized = {};
        return Promise.all(
            Object.keys(tree).map(function(key){
                return System.normalize(key)
                    .then(function(key_normlized){
                        keys_normalized[key] = key_normlized;
                    });
            }))
            .then(function(){
                var tree_normalized = {};
                for(var key in tree)
                    tree_normalized[keys_normalized[key]] = tree[key];
                return tree_normalized;
            });
        */


    })
    .then(function(tree_normalized){

        var code_dependency = tree_normalized[code.path];

        assert(code_dependency);
        assert(code_dependency.deps);

        var dependencies = code_dependency.deps;

        dependencies =
            dependencies.map(function(uri){
                assert(code_dependency.depMap[uri]);
                return new Code({
                    uri: code_dependency.depMap[uri],
                    filename_extension: 'jspm.js',
                    includer: code
                });
            });

        callback(dependencies);

    })
    .catch(function(err){console.error(err.stack || err)})
}

