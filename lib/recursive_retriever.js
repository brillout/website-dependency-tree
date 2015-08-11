// recursive dependency retrieval

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

    assert(code && code.constructor === Code);

    if( already_retrieved[code.uri] ) {
        callback(already_retrieved[code.uri]);
    }
    else {
        new Promise(function(resolve){
            retrieve_dependencies(code, resolve);
        })
        .then(function(dependencies){
            return Promise.all(
                dependencies.map(function(dependency_code){
                    return new Promise(function(resolve){
                        add_dependencies(dependency_code, resolve);
                    });
                });
            );
        })
        .then(function(dependencies){
            code.dependencies = dependencies;
            already_retrieved[code.uri] = code;
            callback(code);
        });
    }

}
