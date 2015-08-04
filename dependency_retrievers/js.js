var precinct = require('precinct');

var make_dependency_paths_absolute = require('./common/make_dependency_paths_absolute');

module.exports = function(html_dir, path, callback){

    var dependencies = precinct.paperwork(path);

    dependencies = make_dependency_paths_absolute(html_dir, path, dependencies);

    callback(dependencies);

};
