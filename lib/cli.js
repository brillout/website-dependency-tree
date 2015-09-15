#!/usr/bin/env node

global.Promise = require('bluebird');
Promise.longStackTraces();
var assert = require('better-assert');
var chalk = require('chalk');

var cli_args = require('auto-cli');
var log = require('mini-log');
var dependency_tree_retriever = require('./api.js');
var recursion_worker = require('./workers/recursion.js').recurse_execution;
var dependency_clean_worker = require('./workers/dependency.js').clean;


dependency_tree_retriever.pipeline_workers.splice(
    dependency_tree_retriever.pipeline_workers.indexOf(dependency_clean_worker) ,
    0 ,
    function(code, done){
        log.verbose.calc(
            'dependencies of `'+code.name+'`');
        done();
    });
dependency_tree_retriever.pipeline_workers.splice(
    dependency_tree_retriever.pipeline_workers.indexOf(recursion_worker) ,
    0 ,
    function(code, done){
        log.verbose.ok(
            'dependencies of `'+code.name+'`');
        done();
    });


cli_args([
    {
        filename_extension: 'html',
        optional: true
    },
    '--verbose',
    '--silent',
    {
        name: 'http',
        optional: true,
        matches: function( arg ) {
            if( /^http/.test(arg) ){
                return arg;
            }
            return null;
        }
    }
])
// retrieve dependencies
.then(function(input){
    var uri = input.html||input.http;
    if( ! uri ) {
        throw "wrong usage; URL or path to html file argument is missing";
    }
    log.calc(
        'dependency tree of `'+uri+'`');
    dependency_tree_retriever.retrieve({
        uri: uri,
        verbose: !input['--silent'] && (input['--verbose'] || input.http),
        callback: function(code){
            log.ok(
                tree_to_text(code, 'name', 'dependencies'));
        }
    });

})


function tree_to_text(tree, node_key, childs_key, no_recursion) {
    var archy = require('archy');

    var already_in_tree = {};

    return archy(adapt_tree(tree));

    function adapt_tree(current_tree){

        var node_text = current_tree[node_key];
        if( ! current_tree.source_code ) node_text = chalk.dim(node_text); // hakcy implementation for now

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
