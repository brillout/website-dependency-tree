var jsdom = require('jsdom');
var path = require('path');
var assert = require('better-assert');

module.exports = function(baseURL, entry_point, callback) {

    assert(/^\//.test(entry_point));

    jsdom.env(entry_point, function(err, window){

        /*
        var ret = {};
        ret[entry_point] =
            get_attribute_values('href')
            .concat(
                get_attribute_values('src'))
            .map(function(url_relative){
                return path.join(path.dirname(entry_point), url_relative); });
                */

        callback(
            get_attribute_values('href')
            .concat(
                get_attribute_values('src'))
            .map(function(url_relative){
                return path.join(path.dirname(entry_point), url_relative); })
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

