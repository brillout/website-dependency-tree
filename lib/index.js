#!/usr/bin/env node

//if( ! global.Promise ) {
    global.Promise = require('bluebird');
    Promise.longStackTraces();
//}
var assert = require('better-assert');

var Code = require('./code-class.js');
require('./add-pipeline-workers.js');


var path_to_code = (function(){
    var path = (function(){
        if( process.argv[2] )
            return process.argv[2];
        return 'src/index.html';
    })();

    if( /^\//.test(path) ) return path;

    return require('path').join(process.cwd(), path);
})();

var code = new Code({uri: path_to_code});

code.execute_pipeline(function(){
    archy_print(
        code.id,
        (code.dependencies_all||[])
            .map(function(code){
                return code.id;
            }));
});

function archy_print(label, nodes){
    var tree = require('archy')({
        label: label,
        nodes: nodes
    });
    console.log(tree);
}
