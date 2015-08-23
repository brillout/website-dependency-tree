#!/usr/bin/env node

global.Promise = require('bluebird');
Promise.longStackTraces();
var assert = require('better-assert');

var cli_args = require('auto-cli');
var log = require('./log.js');
var dependency_tree_retriever = require('./api.js');


cli_args(['html', '--verbose'])
// retrieve dependencies
.then(function(input){
    dependency_tree_retriever.pipeline_workers.unshift(function(code, done){
        log.verbose.calc(
            'dependencies of `'+code.id+'`');
        done();
    });
    dependency_tree_retriever.pipeline_workers.splice(6, 0, function(code, done){
        log.verbose.ok();
            //tree_to_text(code, 'id', 'dependencies', true));
        done();
    });

    dependency_tree_retriever.retrieve({
        uri: input.html,
        verbose: input['--verbose'],
        callback: function(code){
            log.calc(
                'dependency tree of `'+code.id+'`');
            log.ok(
                tree_to_text(code, 'id', 'dependencies'));

            log.calc(
                'all transitive dependencies of `'+code.id+'`');
            log.ok(
                tree_to_text(code, 'id', 'dependencies_all', true));
        }
    });

})


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
