// retrieve dependencies defined in HTML, including inline code

var jsdom = require('jsdom');
var assert = require('better-assert');


module.exports = function(code, done) {

    var Code = require('../code-class.js');

    assert(code && code.constructor === Code);

    if( ! code.mime_type ||
        code.mime_type !== 'text/html' ||
        ! code.source_code ){
        done();
        return;
    }

    get_dependencies(code.source_code.toString('utf8'), function(dependencies_found, dom_document){

        code.dom_node = dom_document.documentElement;
        code.dom_document = dom_document;

        code.dependencies =
            (code.dependencies||[])
            .concat(
                dependencies_found
                .map(function(code_dependency){
                    return (
                        new Code({
                            location: {
                                uri: code_dependency.uri
                            },
                            source_code: typeof code_dependency.source_code !== 'undefined' ? new Buffer(code_dependency.source_code, 'utf8') : undefined,
                            mime_type: code_dependency.mime_type,
                            dom_node: code_dependency.dom_node,
                            includer: code
                        })
                    );
                }));

        done();

    });

};


function get_dependencies(source_code, callback){

    jsdom.env(source_code.toString('utf-8'), function(err, window){

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
                else {
                    dependency.source_code = content || '';
                }

                if( dom_node.tagName === 'SCRIPT' ) {
                    dependency.mime_type = 'application/javascript';
                }

                if( dom_node.tagName === 'STYLE' ||
                    dom_node.tagName === 'LINK' && dom_node.getAttribute('rel').toLowerCase()==='stylesheet' ) {
                    dependency.mime_type = 'text/css';
                }

                /*
                if( dom_node.tagName === 'AUDIO' ) {
                    dependency.mime_type = 'audio/*';
                }

                if( dom_node.tagName === 'VIDEO' ) {
                    dependency.mime_type = 'video/*';
                }

                if( dom_node.tagName === 'IMG' ) {
                    dependency.mime_type = 'image/*';
                }
                */

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
