#!/usr/bin/env node

//if( ! global.Promise ) {
    global.Promise = require('bluebird');
    Promise.longStackTraces();
//}

var assert = require('better-assert');

var Code = require('./code-class.js');


var html_path = (function(){
    var path = (function(){
        if( process.argv[2] )
            return process.argv[2];
        return 'src/index.html';
    })();

    return require('path').join(process.cwd(), path);
})();

assert(/\.html$/.test(html_path), '`html_path` should point to an HTML file');

require('./recursive_retriever.js')(
    new Code({uri: html_path}),
    function(code){
        var dependencies_all = get_all_transitive_dependencies(code);
        var dependency_tree = {
            label: html_path,
            nodes: dependencies_all
        };
        console.log(require('archy')(dependency_tree));
    });


function get_all_transitive_dependencies(code){

    var already_traversed = {};

    return traverse_dependency_tree(code);

    function traverse_dependency_tree(code){
        var dependencies =
            (code.dependencies || [])
            .filter(function(code){
                assert(code.uri);
                return ! already_traversed[code.uri];
            });
        return (
            []
                .concat(
                    dependencies
                    .map(function(code){
                        return code.uri;
                    }))
                .concat(
                    dependencies
                    .map(function(code){
                        already_traversed[code.uri] = true;
                        return traverse_dependency_tree(code);
                    })
                    .reduce(function(left_array, right_array){
                        return left_array.concat(right_array);
                    },[]))
        );
    }
}
