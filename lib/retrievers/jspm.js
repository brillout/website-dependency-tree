// retrieve dependencies defined with JSPM


var assert = require('better-assert');
var jspm = require('jspm');


var systemBuilder = new jspm.Builder();

module.exports = function(code, done){

    var Code = require('../code-class.js');

    assert(code && code.constructor === Code);
    assert(code.type);

    if( code.type !== 'jspm.js'  ) {
        done();
        return;
    }

    get_dependencies(code.uri, function(dependencies_found){

        code.path = path_normalized.replace(/^file:\/*(?=\/)/,'');

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


var path_normalized;
function get_dependencies(uri, callback){
    Promise
    .resolve()
    .then(function(){
        return System.normalize(uri);
    })
    .then(function(path){
        path_normalized = path;
    })
    .then(function(){
        return systemBuilder.trace(uri);
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

        var code_dependency = tree_normalized[path_normalized];

        assert(code_dependency);
        assert(code_dependency.deps);

        var dependencies_found = code_dependency.deps;

        dependencies_found =
            dependencies_found.map(function(uri){
                assert(code_dependency.depMap[uri]);
                return code_dependency.depMap[uri];
            });

        callback(dependencies_found);

    })
    .catch(function(err){console.error(err.stack || err)})
}
