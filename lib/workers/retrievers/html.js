// retrieve dependencies defined in HTML, including inline code

var jsdom = require('jsdom');
var assert = require('better-assert');
require('core-js/fn/map');
var log = require('mini-log');
var Code = require('../../code-class.js');


module.exports = function(code, done) {

    assert(code && code.constructor === Code);

    if( ! code.mime_type ||
        code.mime_type !== 'text/html' ||
        ! code.source_code ){
        done();
        return;
    }

    get_dependencies(code.source_code.toString('utf8'), function(dependencies_found, document){

        var node_map = new Map();
        code.mutation = get_mutation_fcts(code, document, node_map);
        assert(
            code.mutation.removeDependency &&
            code.mutation.insertDependencyBefore &&
            Object.keys(code.mutation).length===2 );

        code.dependencies =
            (code.dependencies||[])
            .concat(
                dependencies_found
                .map(function(dependency){
                    var code_dependency =
                        new Code({
                            location: {
                                uri: dependency.uri
                            },
                            source_code: typeof dependency.source_code !== 'undefined' ? new Buffer(dependency.source_code, 'utf8') : undefined,
                            mime_type: dependency.mime_type,
                            module_loader: 'html',
                            last_includer: code
                        }) ;
                    node_map.set(code_dependency, dependency.dom_node);
                    return code_dependency;
                })
            );

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

        window.document.serialize = function(){return new Buffer(jsdom.serializeDocument(window.document))};

        callback(
            dependencies_found,
            window.document);

    });

}


function get_mutation_fcts(code, document, node_map){

    return {
        removeDependency: removeDependency,
        insertDependencyBefore: insertDependencyBefore
    };

    function removeDependency(code_dependency){

        apply_dom_changes();
        code.source_code = new Buffer(document.serialize());
        return code.execute_pipeline();

        /*
        remove_from_array(code, 'dependencies', code_dependency);
        remove_from_array(code, 'dependencies_all', code_dependency);

        function remove_from_array(code, key, code_dependency){
            var index = (code[key]||[]).indexOf(code);
            if( index === -1 ) {
                log.warn("attempted removal failed because can't find `"+code_dependency.id+"` in `"+key+"` of `"+code.id+"`");
                return;
            }
            else {
                code[key].splice(index, 1);
            }
        }
        */

        function apply_dom_changes(){
            if( (code_dependency||{}).constructor !== Code ) {
                throw "argument to `"+removeDependency.name+"` needs to be created with `new Code()`";
            }

            var node = get_node(code_dependency);
            if( node ) {
                try{
                    node.parentElement.removeChild(node);
                }catch(err){
                    log.warn("can't remove dependency `"+code_dependency.id+"` from `"+code.id+"` because; "+err);
                }
            }
        }
    }

    function insertDependencyBefore(code_dependency, code_anchor){

        apply_dom_changes();
        code.source_code = new Buffer(document.serialize());
        return code.execute_pipeline();

        function apply_dom_changes(){
            if( (code_dependency||{}).constructor !== Code ||
                code_anchor && code_anchor.constructor !== Code ) {
                throw "argument to `"+insertDependencyBefore.name+"` needs to be created with `new Code()`";
            }

            if( ['text/css', 'application/javascript'].indexOf( code_dependency.mime_type ) === -1 ) {
                throw "can't add dependency `"+code_dependency.id+"` because of its unsupported  mime_type `"+code_dependency.mime_type+"`";
            }

            var node = (function(){
                var node;
                //var path_relative = code_dependency.location.disk.path_relative_to_base;
                var path_relative = require('path').relative(require('path').dirname(code.location.disk.path), code_dependency.location.disk.path);
                if( code_dependency.mime_type === 'application/javascript' ) {
                    node = document.createElement("script");
                    node.src = path_relative;
                    return node;
                }
                if( code_dependency.mime_type === 'text/css' ) {
                    node = document.createElement("link");
                    node.setAttribute('rel', 'stylesheet');
                    node.href = path_relative;
                    return node;
                }
                assert(false);
            })();

            if( ! code_anchor ) code_anchor = code.dependencies.slice(-1)[0];
            var node_anchor = code_anchor && get_node(code_anchor);
            if( ! node_anchor ) {
                (function(){
                    if( code_dependency.mime_type === 'application/javascript' ) {
                        return document.querySelector('body') || document.documentElement;
                    }
                    if( code_dependency.mime_type === 'text/css' ) {
                        return document.querySelector('head') || document.documentElement;
                    }
                    assert(false);
                })()
                .appendChild(node);
            }
            else {
                node_anchor.parentElement
                .insertBefore(node, node_anchor);
            }
        }

    }

    function get_node(code_dependency){
        assert(code_dependency && code_dependency.constructor === Code);
        var node = node_map.get(code_dependency);
        if( ! node ) {
            warning("can't find DOM node of `"+code_dependency.id+"`");
        }
        return node;
    }

    function warning(reason){
        log.warn("can't mutate dependencies of `"+code.id+"` because "+reason);
    }

}

