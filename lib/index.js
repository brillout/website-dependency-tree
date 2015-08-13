#!/usr/bin/env node

//if( ! global.Promise ) {
    global.Promise = require('bluebird');
    Promise.longStackTraces();
//}

var assert = require('better-assert');

var Code = require('./code-class.js');
require('./add-pipeline-workers.js');


var html_path = (function(){
    var path = (function(){
        if( process.argv[2] )
            return process.argv[2];
        return 'src/index.html';
    })();

    return require('path').join(process.cwd(), path);
})();

assert(/\.html$/.test(html_path), '`html_path` should point to an HTML file');


//*
var code = new Code({uri: html_path});

code.execute_pipeline(function(){
    archy_print(
        code.path,
        code.dependencies_all);
});




/*/

require('./recursive_retriever.js')(
    new Code({uri: html_path}),
    function(code){
        archy_print(
            html_path,
            get_all_transitive_dependencies(code));
    });


function get_all_transitive_dependencies(code){

    var already_traversed = {};

    return traverse_dependency_tree(code);

    function traverse_dependency_tree(code){
        var dependencies =
            (code.dependencies || [])
            .filter(function(code){
                return ! already_traversed[code.id];
            });
        return (
            []
                .concat(
                    dependencies
                    .map(function(code){
                        return code.id;
                    }))
                .concat(
                    dependencies
                    .map(function(code){
                        already_traversed[code.id] = true;
                        return traverse_dependency_tree(code);
                    })
                    .reduce(function(left_array, right_array){
                        return left_array.concat(right_array);
                    },[]))
        );
    }
}
//*/

function archy_print(label, nodes){
    var tree = require('archy')({
        label: label,
        nodes: nodes
    });
    console.log(tree);
}
