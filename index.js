#!/usr/bin/env node

var path = require('path');
var archy = require('archy');
require('when/es6-shim/Promise');

var retrievers = {
    html: require('./retrievers/html.js'),
    js: require('./retrievers/js.js')
};

var entry_point = 'src/index.html';
entry_point = path.join(process.cwd(), entry_point);

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
        callback();
        return;
    }

    Promise
        .all(
            dependencies_missing
                .map(function(path){
                    return new Promise(function(resolve){

                        var suffix = path.split('.').pop();

                        if( ! suffix ) {
                            console.log("WARNING; file "+path+" is missing a suffix");
                            dependencies[path] = null;
                            resolve();
                            return;
                        }
                        if( ! retrievers[suffix] ) {
                            console.log("can't retrieve dependencies of "+path+"; *."+suffix+" files not supported");
                            dependencies[path] = null;
                            resolve();
                            return;
                        }

                        retrievers[suffix](path, function(path_dependencies){
                            dependencies[path] = path_dependencies[path];
                            console.log(path, path_dependencies);
                            dependencies[path].forEach(function(dependency_path){
                                // make `dependencies.hasOwnProperty(dependency_path) === true;`
                                dependencies[dependency_path] = dependencies[dependency_path];
                            });
                            resolve();
                        });

                    });
                }))
        .then(traverse_dependency_tree)
        .catch(function(err){console.log(new Error(err).stack)});
})();


function callback(){
    var nodes = [];
    var dependency_tree = {
        label: entry_point,
        nodes: Object.keys(dependencies)
    };
    console.log(archy(dependency_tree));
}
