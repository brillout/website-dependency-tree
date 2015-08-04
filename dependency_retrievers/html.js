var jsdom = require('jsdom');
var path = require('path');
var assert = require('better-assert');

module.exports = function(html_dir, html_path, callback) {

    assert(/^\//.test(html_path));

    jsdom.env(html_path, function(err, window){

        /*
        var ret = {};
        ret[html_path] =
            get_attribute_values('href')
            .concat(
                get_attribute_values('src'))
            .map(function(url_relative){
                return path.join(path.dirname(html_path), url_relative); });
                */

        callback(
            get_attribute_values('href')
            .concat(
                get_attribute_values('src'))
            .map(function(url_relative){
                return path.join(path.dirname(html_path), url_relative); })
       );

        function get_attribute_values(attribute){
            return (
                [].slice.call(
                    window.document.querySelectorAll('['+attribute+']'))
                .map(function(dom_element){
                    return dom_element[attribute] })
                .filter(function(value){ return !!value })
            );
        }
    });

}

