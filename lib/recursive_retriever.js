// recursive dependency retrieval


var retrieve_dependencies = require('./dependency_retrievers/generic.js');

module.exports = function(html_code, callback){


    var codes = [html_code];

    (function traverse_dependency_tree(){

        Promise
            .all(
                codes
                .filter(function(code){
                    // retrieval of dependencies by fetching code over the network not supported yet
                    if( /^http/.test(code.path) ) return false;

                    // `code.dependencies === undefined` <~> dependencies not retrieved yet
                    return code.dependencies === undefined;
                })
                .map(function(code){
                    return new Promise(function(resolve){

                        retrieve_dependencies(
                            html_code,//require('path').dirname(html_path) + '/',
                            code,
                            function(dependencies){
                                code.dependencies = dependencies;
                                (dependencies || []).forEach(function(dependency_path){
                                    // make `dependencies.hasOwnProperty(dependency_path) === true;`
                                    dependencies[dependency_path] = dependencies[dependency_path];
                                });
                                resolve();
                            });

                    });
                }))
            .then(function(values){
                if( values.length === 0 ) {
                    delete dependencies[html_path];
                    callback(dependencies);
                }
                else {
                    traverse_dependency_tree();
                }
            })
    })();


};


var Code = require('./common/code-class.js');
var retrieve_dependencies = require('./dependency_retrievers/generic.js');


module.exports = function(code, callback){

    assert(code && code.constructor === Code);

    add_dependencies(html_code, function(){
        callback(code.dependencies);
    });


};


var already_retrieved = {};

function add_dependencies(code, callback){

    if( already_retrieved[code.hash] ) {
        code.dependencies = already_retrieved[code.hash];
        callback();
    }
    else {
        retrieve_dependencies(code, function(dependencies){
            code.dependencies = dependencies;
            already_retrieved[code.hash] = dependencies;

            Promise.all(
                dependencies.map(function(code){
                    return new Promise(function( resolve ) {
                        add_dependencies(code, function(dependencies){
                            code.dependencies = dependencies;
                            resolve();
                        });
                    });
                });
            ).
            then(function(){
                callback();
            });
        });
    }


}
