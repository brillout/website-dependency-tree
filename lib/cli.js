#!/usr/bin/env node

global.Promise = require('bluebird');
Promise.longStackTraces();
var assert = require('better-assert');

var dependency_tree_retriever = require('./api.js');

var path_to_code = (function(){
    var path = (function(){
        if( process.argv[2] )
            return process.argv[2];
        return 'src/index.html';
    })();

    if( /^\//.test(path) ) return path;

    return require('path').join(process.cwd(), path);
})();

/*
dependency_tree_retriever.pipeline_workers.unshift(function(code, done){
    console.log('retrieving dependencies of '+code.id+' ...');
    done();
});
dependency_tree_retriever.pipeline_workers.push(function(code, done){
    console.log('ok   -    dependencies of '+code.id);
    console.log(tree_to_text(code.id,(code.dependencies||[]).map(function(code){return code.id})));
    done();
});
*/

dependency_tree_retriever.retrieve(path_to_code, function(code){
    console.log(tree_to_text(
        code.id,
        (code.dependencies_all||[])
            .map(function(code){
                return code.id;
            })));
});

function tree_to_text(label, nodes){
    var tree = require('archy')({
        label: label,
        nodes: nodes
    });
    return tree;
}
