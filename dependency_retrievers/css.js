var make_dependency_paths_absolute = require('./common/make_dependency_paths_absolute');

var URL_REGEX = /\burl\(['"]?([^'"\)]*)['"]?\)/g;

module.exports = function(html_dir, path, callback) {

    var dependencies = [];

    var source_code = require('fs').readFileSync(path).toString();

    if( /\.css$/.test(path) ) {
        dependencies = dependencies.concat(
            ast_search(source_code));
    }
    else { // .scss, .sass
        dependencies = dependencies.concat(
            regex_search(source_code, /\@import\s+['"]([^'"\)]*)['"]/g));

        dependencies = dependencies.concat(
            regex_search(source_code, URL_REGEX));
    }


    dependencies = make_dependency_paths_absolute(html_dir, require('path').dirname(path), dependencies);


    callback(dependencies);

};


function ast_search(source_code){

    var css = require('css').parse(source_code).stylesheet;

    var dependencies_found = [];

    css.rules.forEach(function(rule){
        var dependency;
        if( rule.import )
            dependencies_found.push(parse_url(rule.import));
        if( rule.declarations )
            rule.declarations.forEach(function(decleration){
                dependencies_found = dependencies_found.concat(
                    regex_search(decleration.value, URL_REGEX));
            });
    });

    return dependencies_found;

    function parse_url(str){
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
            dependencies_found.push(matches[1]);
        }

    } while (matches);

    return dependencies_found;

}
