var jsdom = require('jsdom');
var assert = require('better-assert');

var Code = require('../code-class.js');


module.exports = function(code, callback) {

    assert(code && code.constructor === Code);
    assert(code.filename_extension === 'html');
    assert(code.path);

    jsdom.env(code.path, function(err, window){

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

            .map(function(code_dependency){
                return (
                    new Code({
                        uri: code_dependency.uri,
                        source_code: code_dependency.source_code,
                        filename_extension: code_dependency.filename_extension,
                        includer: code
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
