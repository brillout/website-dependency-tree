var precinct = require('precinct');

module.exports = function(html_dir, path, callback){

    var dependencies = precinct.paperwork(path);

    dependencies =
        require('./common/make_dependency_paths_absolute.js')(
            html_dir,
            path,
            dependencies);

    dependencies =
        require('./common/paths_to_objects.js')(
            dependencies);

    callback(dependencies);

};
