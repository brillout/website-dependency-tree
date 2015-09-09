// retrieve dependencies defined in css, sass, and scss

var assert = require('better-assert');


var URL_REGEX = /\burl\(['"]?([^'"\)]*)['"]?\)/g;

module.exports = function(code, done) {

    var Code = require('../code-class.js');

    assert(code && code.constructor === Code);
    assert(code.mime_type);

    if( ['text/css','text/x-sass','text/x-scss','text/less'].indexOf(code.mime_type) === -1 ||
        ! code.source_code ) {
        done();
        return;
    }

    get_dependencies(code.mime_type, code.source_code.toString('utf8'), function(dependencies_found){

        code.dependencies =
            (code.dependencies||[])
            .concat(
                dependencies_found
                .map(function(code_dependency){
                    return new Code({
                        location: {
                            uri: code_dependency.uri
                        },
                        mime_type: code_dependency.mime_type,
                        includer: code
                    });
                }));

        done();

    });

};


function get_dependencies(mime_type, source_code, callback){

    var dependencies_found = [];

    if( mime_type === 'text/css' ) {
        dependencies_found = dependencies_found.concat(
            ast_search(source_code));
    }
    else { // .scss, .sass, .less
        dependencies_found = dependencies_found.concat(
            regex_search(source_code, /\@import\s+['"]([^'"\)]*)['"]/g));

        dependencies_found = dependencies_found.concat(
            regex_search(source_code, URL_REGEX));
    }

    callback(dependencies_found);

}


function ast_search(source_code){

    var css = require('css').parse(source_code).stylesheet;

    var dependencies_found = [];

    css.rules.forEach(function(rule){
        var dependency;
        if( rule.import )
            dependencies_found.push({
                uri: parse_uri(rule.import),
                mime_type: 'text/css'
            });
        if( rule.declarations )
            rule.declarations.forEach(function(decleration){
                dependencies_found = dependencies_found.concat(
                    regex_search(decleration.value, URL_REGEX));
            });
    });

    return dependencies_found;

    function parse_uri(str){
        return (
            str
            .replace(/^url\(([^\)]*)\)$/,'$1')
            .replace(/^'([^']*)'$/,'$1')
            .replace(/^"([^"]*)"$/,'$1'));
    }
}

function regex_search(source_code, regex){

    var dependencies_found = [];

    var matches;

    do {
        matches = regex.exec(source_code);

        if (matches) {
            dependencies_found.push({
                uri: matches[1]
            });
        }

    } while (matches);

    return dependencies_found;

}
