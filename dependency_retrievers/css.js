module.exports = function(baseURL, path, callback) {

    var dependencies = [];

    search_and_add(path, dependencies, /\@import\s+['"](.*)['"]/g);
    search_and_add(path, dependencies, /[^a-zA-Z]url\((?:['"]?)(.*)(?:['"]?)\)$/g);

    dependencies = absolute_path(baseURL, path, dependencies);

    callback(dependencies);

};


function search_and_add(path, paths, regex){
    var source_code = require('fs').readFileSync(path);

    var matches;

    do {
        matches = regex.exec(source_code);

        if (matches) {
            paths.push(matches[1]);
        }

    } while (matches);
}

function absolute_path(baseURL, base_path, paths){
    return (
        paths
            .map(function(path){
                return require('path').join(require('path').dirname(base_path), path); })
    );
}
