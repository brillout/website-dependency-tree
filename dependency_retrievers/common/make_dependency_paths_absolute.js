module.exports = function make_paths_absolute(html_dir, includer, paths){
    return (
        paths
            .map(function(dependency_path){
                if( /^http/.test(dependency_path) ) return dependency_path;

                var is_relative_to_html_dir = /^\//.test(dependency_path);
                var base_dir = is_relative_to_html_dir ? html_dir : require('path').dirname(includer);

                return require('path').join(base_dir, dependency_path); })
    );
}

