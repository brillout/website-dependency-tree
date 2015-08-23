// retrieve dependencies defined with AMD, CommonJS, and ES6
// Note; not used at the moment; wrong results on jspm_packages/system.js

var assert = require('better-assert');
var jsdom = require('jsdom');
var precinct = require('precinct');
var Code = require('../code-class.js');


module.exports = [
    handle_html,
    handle_js
];


function handle_html(code, done){

    assert(code && code.constructor === Code);
    assert(code.type);

    if( code.type !== 'html' || ! code.source_code ){
        done();
        return;
    }

    assert(code.source_code);

    get_dependencies(code.source_code, function(dependencies_found){
        code.dependencies =
            (code.dependencies||[])
            .concat(
                dependencies_found
                .map(function(uri){
                    return new Code({
                        uri: uri,
                        includer: code,
                        type: 'require.js'
                    });
                }));
        done();
    });


    function get_dependencies(source_code, callback){
        jsdom.env(source_code, function(err, window){
            var dependencies_found = [];

            dependencies_found =
                [].slice.call(
                    window.document.querySelectorAll('script[data-main]'))
                .map(function(script_node){
                    var uri = script_node.getAttribute('data-main');
                    if( uri && (uri.slice(-3) !== '.js') ) uri += '.js';
                    return uri;
                })
                .filter(function(value){ return !!value })

            callback(dependencies_found);
        });
    }

}


function handle_js(code, done){

    assert(code && code.constructor === Code);
    assert(code.type);

    if( code.type !== 'require.js' || ! code.source_code ) {
        done();
        return;
    }

    assert(code.source_code);

    get_dependencies(code.source_code, function(dependencies_found){

        code.dependencies =
            (code.dependencies||[])
            .concat(
                dependencies_found
                .map(function(uri){
                    return new Code({
                        uri: uri,
                        includer: code,
                        type: 'require.js'
                    });
                }));

        done();
    });


    function get_dependencies(source_code, callback){

        var dependencies_found =
            precinct(source_code)
            .map(function(uri){
                if( uri && (uri.slice(-3) !== '.js') ) uri += '.js';
                return uri;
            });
        callback(dependencies_found);

    };
}

