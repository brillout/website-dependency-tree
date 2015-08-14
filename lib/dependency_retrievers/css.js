var assert = require('better-assert');


var URL_REGEX = /\burl\(['"]?([^'"\)]*)['"]?\)/g;

module.exports = function(code, callback) {

    var Code = require('../code-class.js');

    assert(code && code.constructor === Code);
    assert(code.filename_extension);

    if( ['css','sass','scss'].indexOf(code.filename_extension) === -1 ||
        ! code.source_code ) {
        callback();
        return;
    }

    get_dependencies(code.filename_extension, code.source_code, function(dependencies_found){

        code.dependencies =
            (code.dependencies||[])
            .concat(
                dependencies_found
                .map(function(code_dependency){
                    return new Code({
                        uri: code_dependency.uri,
                        filename_extension: code_dependency.filename_extension,
                        includer: code
                    });
                }));

        callback();

    });

};


function get_dependencies(filename_extension, source_code, callback){

    var dependencies_found = [];

    if( filename_extension === 'css' ) {
        dependencies_found = dependencies_found.concat(
            ast_search(source_code));
    }
    else { // .scss, .sass
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
                filename_extension: 'css'
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
