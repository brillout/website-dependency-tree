// retrieve dependencies defined in HTML, including inline code

var jsdom = require('jsdom');
var assert = require('better-assert');


module.exports = function(code, done) {

    var Code = require('../code-class.js');

    assert(code && code.constructor === Code);
    assert(code.type);

    console.log(code.type);
    console.log(!!code.source_code);
    if( code.type !== 'html' ||
        ! code.source_code ){
        done();
        return;
    }

    assert(code.source_code);

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

        done();

    });

};


function get_dependencies(source_code, callback){

    jsdom.env(source_code, function(err, window){

        var dependencies_found =
            []

            // get linked assets
            .concat(
                search_dom(window, 'href'))
            .concat(
                search_dom(window, 'src'))

            // get inline code
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
                }));


        callback(dependencies_found);

    });

}


function search_dom(window, attribute){
    return (
        [].slice.call(
            window.document.querySelectorAll('['+attribute+']'))
        .filter(function(dom_element){
            if( !dom_element.getAttribute(attribute) ) return false;
            return ! is_of_type(dom_element, ['a']) })
        .map(function(dom_element){
            return {
                uri: dom_element.getAttribute(attribute),
                no_dependencies: is_of_type(dom_element, ['img','video','audio'])
            }; })
    );

    function is_of_type(dom_element, node_name){
        return node_name.indexOf( dom_element.nodeName.toLowerCase() ) !== -1;
    }
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
