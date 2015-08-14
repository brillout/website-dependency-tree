#!/usr/bin/env node

global.Promise = require('bluebird');
Promise.longStackTraces();
var assert = require('better-assert');
var chalk = require('chalk');
var archy = require('./archy.js');

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
    log(
        'calc',
        'dependencies of '+chalk.magenta(code.id));
    done();
});
dependency_tree_retriever.pipeline_workers.splice(6, 0, function(code, done){
    log(
        'ok',
        archy(code, 'id', 'dependencies', true));
    done();
});

dependency_tree_retriever.retrieve(path_to_code, function(code){
    log(
        'calc',
        'dependency tree of '+chalk.magenta(code.uri));
    log(
        'ok',
        archy(code, 'id', 'dependencies'));

    log(
        'calc',
        'all transitive dependencies of '+chalk.magenta(code.uri));
    log(
        'ok',
        archy(code, 'id', 'dependencies_all', true));
});

function log(type, msg){
    var MARGIN_SIZE = 6;
    var left_margin = fill_space('');
    var left_margin_text =
       type === 'err' && chalk.red.bold(fill_space('err')) ||
       type === 'warn' && chalk.yellow.bold(fill_space('warn')) ||
       type === 'ok' && chalk.green.bold(fill_space('ok')) ||
       type === 'calc' && chalk.grey.bold(fill_space('calc'));

    msg = msg.replace(/^/, left_margin_text);
    msg = msg.replace(/\n/g, '\n'+left_margin);

    console.log(msg);

    function fill_space(text){
        while(text.length<MARGIN_SIZE){ text+=' ' }
        return text;
    }
}

function tree_to_text(tree, node_key, childs_key, no_recursion) {
    var archy = require('archy');

    var already_in_tree = {};

    return archy(adapt_tree(tree));

    function adapt_tree(current_tree){

        var node_text = current_tree[node_key];

        var do_show = ! already_in_tree[node_text];
        already_in_tree[node_text] = true;

        return {
            label: node_text,
            nodes:
                ( do_show && current_tree[childs_key] || [] )
                .map(function(child_tree){
                    if( no_recursion ) {
                        return child_tree[node_key];
                    }
                    return adapt_tree(child_tree);
                })
        };

    }

}
