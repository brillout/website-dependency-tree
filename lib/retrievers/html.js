// retrieve dependencies defined in HTML, including inline code

var jsdom = require('jsdom');
var assert = require('better-assert');


module.exports = function(code, callback) {

    var Code = require('../code-class.js');

    assert(code && code.constructor === Code);
    assert(code.type);

    if( code.type !== 'html' ||
        ! code.source_code ){
        callback();
        return;
    }

    get_dependencies(code.source_code, function(dependencies_found){

        code.dependencies =
            (code.dependencies||[])
            .concat(
                dependencies_found
                .map(function(code_dependency){
                    return (
                        new Code({
                            uri: code_dependency.uri,
                            source_code: code_dependency.source_code,
                            type: code_dependency.type,
                            includer: code
                        }))
                }));

        callback();

    });

};


function get_dependencies(source_code, callback){

    jsdom.env(source_code, function(err, window){

        var dependencies_found =
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
                            type: 'js',
                            source_code: source_code
                        };
                    }))
                .concat(
                    get_inline_code(window, 'style')
                    .map(function(source_code){
                        return {
                            type: 'css',
                            source_code: source_code
                        };
                    })))


        callback(dependencies_found);

    });

}


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
