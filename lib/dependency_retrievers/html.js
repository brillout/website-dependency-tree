var jsdom = require('jsdom');
var assert = require('better-assert');

var Code = require('../code-class.js');


module.exports = function(includer, callback) {

    assert(includer && includer.constructor === Code);
    assert(includer.filename_extension === 'html');
    assert(includer.path);

    jsdom.env(includer.path, function(err, window){

        callback(
            []

            // get linked assets
            .concat(
                []
                .concat(
                    get_attribute_values(window, 'href'))
                .concat(
                    get_attribute_values(window, 'src'))
                .map(function(uri){
                    return {
                        uri: uri
                    };
                }))

            // get inline code
            .concat(
                []
                .concat(
                    get_inline_code(window, 'script')
                    .map(function(source_code){
                        return {
                            filename_extension: 'js',
                            source_code: source_code
                        };
                    }))
                .concat(
                    get_inline_code(window, 'style')
                    .map(function(source_code){
                        return {
                            filename_extension: 'css',
                            source_code: source_code
                        };
                    })))

            .map(function(code){
                return (
                    new Code({
                        uri: code.uri,
                        source_code: code.source_code,
                        filename_extension: code.filename_extension,
                        includer: includer
                    }))
            })
        );

    });

};

function get_attribute_values(window, attribute){
    return (
        [].slice.call(
            window.document.querySelectorAll('['+attribute+']'))
        .map(function(dom_element){
            return dom_element[attribute] })
        .filter(function(value){ return !!value })
    );
}

function get_inline_code(window, tag_name){
    return (
        [].slice.call(
            window.document.querySelectorAll(tag_name))
        .map(function(dom_element){
            return dom_element.text })
        .filter(function(value){ return !!value })
    );
}
