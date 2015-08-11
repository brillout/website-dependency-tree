#!/usr/bin/env node

var assert = require('better-assert');
var Code = require('./lib/common/code-class.js');

if( ! global.Promise ) {
    global.Promise = require('bluebird');
    Promise.longStackTraces();
}

var html_path = (function(){
    var path = (function(){
        if( process.argv[2] )
            return process.argv[2];
        return 'src/index.html';
    })();

    if( ! require('./common/file-exists.js')(path) ) {
        throw "path "+path+" doesn't point to a file";
    }

    return require('path').join(process.cwd(), path);
})();

assert(/\.html$/.test(html_path), '`html_path` should point to an HTML file');
assert(/^\//.test(html_path), '`html_path` should be an absolute path');

require('./lib/recursive_retriever.js')(
    new Code({path: html_path}),
    function(dependencies){
        var dependency_tree = {
            label: html_path,
            nodes: Object.keys(dependencies)
        };
        console.log(require('archy')(dependency_tree));
    });

