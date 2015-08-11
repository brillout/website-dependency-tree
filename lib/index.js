#!/usr/bin/env node

var assert = require('better-assert');
if( ! global.Promise ) {
    global.Promise = require('bluebird');
    Promise.longStackTraces();
}

var Code = require('./common/code-class.js');


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
    function(dependencies){
        var dependency_tree = {
            label: html_path,
            nodes: Object.keys(dependencies)
        };
        console.log(require('archy')(dependency_tree));
    });

