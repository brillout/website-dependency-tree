module.exports = function(html_path, path, callback) {

    var dependencies = [];

    dependencies = dependencies.concat(
        search_dependencies(path, /\@import\s+['"]([^'"\)]*)['"]/g));

    dependencies = dependencies.concat(
        search_dependencies(path, /\burl\(['"]?([^'"\)]*)['"]?\)/g));


    dependencies = make_paths_absolute(html_path, path, dependencies);


    callback(dependencies);

};


function search_dependencies(path, regex){
    var source_code = require('fs').readFileSync(path);

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

function make_paths_absolute(html_path, includer_path, paths){
    return (
        paths
            .map(function(dependency_path){
                if( /^http/.test(dependency_path) ) return dependency_path;

                var is_relative_to_html_path = /^\//.test(dependency_path);
                var base_path = is_relative_to_html_path ? html_path : includer_path;

                return require('path').join(require('path').dirname(base_path), dependency_path); })
    );
}
