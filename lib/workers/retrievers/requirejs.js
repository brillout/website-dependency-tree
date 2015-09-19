// retrieve dependencies defined with AMD, CommonJS, and ES6
// Note; not used at the moment; wrong results on jspm_packages/system.js

var assert = require('better-assert');
var jsdom = require('jsdom');
var precinct = require('precinct');
var Code = require('../../code-class.js');


module.exports = [
    handle_html,
    handle_js
];


function handle_html(code, done){

    assert(code && code.constructor === Code);

    if( ! code.mime_type ||
        code.mime_type !== 'text/html' ||
        ! code.source_code ){
        done();
        return;
    }

    get_dependencies(code.source_code.toString('utf8'), function(dependencies_found){
        code.dependencies =
            (code.dependencies||[])
            .concat(
                dependencies_found
                .map(function(uri){
                    return new Code({
                        mime_type: 'application/javascript',
                        module_format: 'RequireJS',
                        last_inclusion: {
                            uri: uri,
                            includer: code
                        }
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

    if( ! code.mime_type ||
        code.mime_type !== 'application/javascript' ||
        code.module_format !== 'RequireJS' ||
        ! code.source_code ) {
        done();
        return;
    }

    get_dependencies(code.source_code.toString('utf8'), function(dependencies_found){

        code.dependencies =
            (code.dependencies||[])
            .concat(
                dependencies_found
                .map(function(uri){
                    return new Code({
                        mime_type: 'application/javascript',
                        module_format: 'RequireJS',
                        last_inclusion: {
                            uri: uri,
                            includer: code
                        }
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

