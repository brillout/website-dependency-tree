var assert = require('better-assert');

var retrieve_dependencies = require('./depdency_retrievers/generic.js');

module.exports = function(html_path, callback){

    assert(/\.html$/.test(html_path), '`html_path` should be HTML file');
    assert(/^\//.test(html_path), '`html_path` should be absolute path');

    const baseURL = html_path;

    var dependencies = {};
    dependencies[entry_point] = undefined;

    (function traverse_dependency_tree(){
        var dependencies_missing = (function(){
            var ret = [];
            for(var path in dependencies) if( dependencies[path]===undefined ) ret.push(path);
            return ret;
        })();


        if( dependencies_missing.length === 0 ) {
            delete dependencies[entry_point];
            callback(dependencies);
            return;
        }

        Promise
            .all(
                dependencies_missing
                    .map(function(path){
                        return new Promise(function(resolve){

                            retrieve_dependencies(baseURL, path, function(path_dependencies){
                                dependencies[path] = path_dependencies;
                                dependencies[path].forEach(function(dependency_path){
                                    // make `dependencies.hasOwnProperty(dependency_path) === true;`
                                    dependencies[dependency_path] = dependencies[dependency_path];
                                });
                                resolve();
                            });

                        });
                    }))
            .then(traverse_dependency_tree)
    })();

}
