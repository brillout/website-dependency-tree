#!/usr/bin/env node

global.Promise = require('bluebird');
Promise.longStackTraces();

var path = require('path');
var archy = require('archy');

var retrieve_all_from_html = require('./retrieve-all-from-html.js');

const arg = 'src/index.html';

var entry_point = arg;
entry_point = path.join(process.cwd(), entry_point);

retrieve_all_from_html(entry_point, callback);

function callback(){
    var nodes = [];
    var dependency_tree = {
        label: entry_point,
        nodes: Object.keys(dependencies)
    };
    console.log(archy(dependency_tree));
}
