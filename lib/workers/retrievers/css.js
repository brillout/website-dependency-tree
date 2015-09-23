// retrieve dependencies defined in css, sass, and scss

var assert = require('better-assert');


var URL_REGEX = /\burl\(['"]?([^'"\)]*)['"]?\)/g;

module.exports = function(code, done) {

    var CodeInfo = require('../../code-class.js');

    assert(code && code.constructor === CodeInfo);

    if( ! code.mime_type ||
        ['text/css','text/x-sass','text/x-scss','text/less'].indexOf(code.mime_type) === -1 ||
        ! code.source_code ) {
        done();
        return;
    }

    get_dependees(code.mime_type, code.source_code.toString('utf8'), function(dependees_found){

        code.dependees =
            (code.dependees||[])
            .concat(
                dependees_found
                .map(function(dependee_info){
                    return new CodeInfo({
                        mime_type: dependee_info.mime_type,
                        module_format: 'global',
                        last_inclusion: {
                            uri: dependee_info.uri,
                            depender: code
                        }
                    });
                }));

        done();

    });

};


function get_dependees(mime_type, source_code, callback){

    var dependees_found = [];

    if( mime_type === 'text/css' ) {
        dependees_found = dependees_found.concat(
            ast_search(source_code));
    }
    else { // .scss, .sass, .less
        dependees_found = dependees_found.concat(
            regex_search(source_code, /\@import\s+['"]([^'"\)]*)['"]/g));

        dependees_found = dependees_found.concat(
            regex_search(source_code, URL_REGEX));
    }

    callback(dependees_found);

}


function ast_search(source_code){

    var css = require('css').parse(source_code).stylesheet;

    var dependees_found = [];

    css.rules.forEach(function(rule){
        if( rule.import ) {
            var uri = parse_uri(rule.import);
            if( uri ) {
                dependees_found.push({
                    uri: uri,
                    mime_type: 'text/css'
                });
            }
        }
        if( rule.declarations )
            rule.declarations.forEach(function(decleration){
                dependees_found = dependees_found.concat(
                    regex_search(decleration.value, URL_REGEX));
            });
    });

    return dependees_found;

    function parse_uri(str){
        return (
            str
            .trim()
            .replace(/^url\(([^\)]*)\)$/,'$1')
            .replace(/^'([^']*)'$/,'$1')
            .replace(/^"([^"]*)"$/,'$1'));
    }
}

function regex_search(source_code, regex){

    var dependees_found = [];

    var matches;

    do {
        matches = regex.exec(source_code);

        if (matches) {
            dependees_found.push({
                uri: matches[1]
            });
        }

    } while (matches);

    return dependees_found;

}
