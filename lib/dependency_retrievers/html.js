var jspm = require('jsdom');

module.exports = function(html_dir, path, callback) {

    reuquire('better-assert')(/^\//.test(path));


    jsdom.env(path, function(err, window){

        var dependencies =
            get_attribute_values('href')
            .concat(
                get_attribute_values('src'));


        dependencies =
            require('./common/make_dependency_paths_absolute.js')(
                html_dir,
                path,
                dependencies);

        dependencies =
            require('./common/paths_to_objects.js')(
                dependencies);

        callback(dependencies);

    });

};

function get_attribute_values(attribute){
    return (
        [].slice.call(
            window.document.querySelectorAll('['+attribute+']'))
        .map(function(dom_element){
            return dom_element[attribute] })
        .filter(function(value){ return !!value })
    );
}
