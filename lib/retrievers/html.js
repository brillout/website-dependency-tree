// retrieve dependencies defined in HTML, including inline code

var jsdom = require('jsdom');
var assert = require('better-assert');


module.exports = function(code, done) {

    var Code = require('../code-class.js');

    assert(code && code.constructor === Code);
    assert(code.type);

    if( code.type !== 'html' ||
        ! code.source_code ){
        done();
        return;
    }

    assert(code.source_code);

    get_dependencies(code.source_code, function(dependencies_found, dom_document){

        code.dom_node = dom_document.documentElement;
        code.dom_document = dom_document;

        code.dependencies =
            (code.dependencies||[])
            .concat(
                dependencies_found
                .map(function(code_dependency){
                    return (
                        new Code(
                            Object.assign(
                                { includer: code },
                                code_dependency )
                        )
                    );
                }));

        done();

    });

};


function get_dependencies(source_code, callback){

    jsdom.env(source_code, function(err, window){

        var dependencies_found =
            [].slice.call(
                window.document.querySelectorAll('*[src], *[href]:not(a), script, style, link[rel="stylesheet"]') )
            .map(function(dom_node){
                var dependency = {};

                var uri = dom_node.getAttribute('src') || dom_node.getAttribute('href');
                var content = dom_node.text;

                if( uri ) {
                    dependency.uri = uri;
                }
                else if( content ) {
                    dependency.source_code = content;
                }

                if( dom_node.tagName === 'SCRIPT' ) {
                    dependency.type = 'js';
                }

                if( dom_node.tagName === 'STYLE' ||
                    dom_node.tagName === 'LINK' && dom_node.getAttribute('rel').toLowerCase()==='stylesheet' ) {
                    dependency.type = 'css';
                }

                dependency.dom_node = dom_node;

                return dependency;
            })
            .filter(function(dependency){
                return Object.keys(dependency).length > 0;
            });

        window.document.serialize = function(){return jsdom.serializeDocument(window.document)};

        callback(
            dependencies_found,
            window.document);

    });

}
