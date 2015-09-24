// retrieve dependencies defined with AMD, CommonJS, and ES6
// Note; not used at the moment; wrong results on jspm_packages/system.js

var assert = require('better-assert');
var jsdom = require('jsdom');
var CodeInfo = require('../../code-class.js');


module.exports = [
    handle_html,
    handle_js
];


function handle_html(code, done){

    assert(code && code.constructor === CodeInfo);

    if( ! code.mime_type ||
        code.mime_type !== 'text/html' ||
        ! code.source_code ){
        done();
        return;
    }

    get_dependees(code.source_code.toString('utf8'), function(dependees_found){
        code.dependees =
            (code.dependees||[])
            .concat(
                dependees_found
                .map(function(uri){
                    return new CodeInfo({
                        mime_type: 'application/javascript',
                        module_format: 'RequireJS',
                        last_inclusion: {
                            uri: uri,
                            depender: code
                        }
                    });
                }));
        done();
    });


    function get_dependees(source_code, callback){
        jsdom.env(source_code, function(err, window){
            var dependees_found = [];

            dependees_found =
                [].slice.call(
                    window.document.querySelectorAll('script[data-main]'))
                .map(function(script_node){
                    var uri = script_node.getAttribute('data-main');
                    if( uri && (uri.slice(-3) !== '.js') ) uri += '.js';
                    return uri;
                })
                .filter(function(value){ return !!value })

            callback(dependees_found);
        });
    }

}


function handle_js(code, done){

    assert(code && code.constructor === CodeInfo);

    if( ! code.mime_type ||
        code.mime_type !== 'application/javascript' ||
        code.module_format !== 'RequireJS' ||
        ! code.source_code ) {
        done();
        return;
    }

    get_dependees(code.source_code.toString('utf8'), function(dependees_found){

        code.dependees =
            (code.dependees||[])
            .concat(
                dependees_found
                .map(function(uri){
                    return new CodeInfo({
                        mime_type: 'application/javascript',
                        module_format: 'RequireJS',
                        last_inclusion: {
                            uri: uri,
                            depender: code
                        }
                    });
                }));

        done();
    });


    function get_dependees(source_code, callback){
        var precinct = require('precinct');

        var dependees_found =
            precinct(source_code)
            .map(function(uri){
                if( uri && (uri.slice(-3) !== '.js') ) uri += '.js';
                return uri;
            });
        callback(dependees_found);

    };
}

