#!/usr/bin/env node

global.Promise = require('bluebird');
Promise.longStackTraces();
var assert = require('better-assert');
var chalk = require('chalk');

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

dependency_tree_retriever.pipeline_workers.unshift(function(code, done){
    console.log('retrieving dependencies of '+chalk.magenta(code.id));
    done();
});
dependency_tree_retriever.pipeline_workers.splice(6, 0, function(code, done){
    console.log(chalk.green.bold('ok'),
    tree_to_text(code.id,(code.dependencies||[]).map(function(code){return code.id}))
    );
    done();
});

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



function log(type, msg){
    var types = {
        err: function(msg) {
            return '\n' + chalk.red.bold('err  ') + moduleMsg(msg);
        },
        info: function(msg) {
            return '     ' + moduleMsg(msg);
        },
        warn: function(msg) {
            return '\n' + chalk.yellow.bold('warn ') + moduleMsg(msg);
        },
        ok: function(msg) {
            return chalk.green.bold('ok   ') + moduleMsg(msg);
        }

    };

    console.log(types[type](msg));


    function moduleMsg(msg) {
      return msg;

      return msg
        .replace(/(\s|\`|^)%([^%\n]+)%/g, '$1' + chalk.bold('$2'))
        .replace(/(\s|^)\`([^\`\n]+)\`/g, '$1' + chalk.cyan('$2'))
        .replace(/\n\r?( {0,4}\w)/g, '\n     $1');
    }
}