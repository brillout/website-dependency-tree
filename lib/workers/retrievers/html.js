// retrieve dependencies defined in HTML, including inline code

var jsdom = require('jsdom');
var assert = require('better-assert');
require('core-js/fn/map');
var log = require('mini-log');
var CodeInfo = require('../../code-class.js');


module.exports = function(code, done) {

    assert(code && code.constructor === CodeInfo);

    if( ! code.mime_type ||
        code.mime_type !== 'text/html' ||
        ! code.source_code ){
        done();
        return;
    }

    get_dependees(code.source_code.toString('utf8'), function(dependees_found, document){

        var node_map = new Map();
        code.mutation = get_mutation_fcts(code, document, node_map);
        assert(
            code.mutation.removeDependency &&
            code.mutation.insertDependencyBefore &&
            Object.keys(code.mutation).length===2 );

        code.dependees =
            (code.dependees||[])
            .concat(
                dependees_found
                .map(function(dependee_info){
                    var code_info =
                        new CodeInfo({
                            source_code: typeof dependee_info.source_code !== 'undefined' ? new Buffer(dependee_info.source_code, 'utf8') : undefined,
                            mime_type: dependee_info.mime_type,
                            module_format: 'global',
                            last_inclusion: {
                                uri: dependee_info.uri,
                                includer: code
                            }
                        }) ;
                    node_map.set(code_info, dependee_info.dom_node);
                    return code_info;
                })
            );

        done();

    });

};


function get_dependees(source_code, callback){

    jsdom.env(source_code.toString('utf-8'), function(err, window){

        var dependees_found =
            [].slice.call(
                window.document.querySelectorAll('*[src], *[href]:not(a), script, style, link[rel="stylesheet"]') )
            .map(function(dom_node){
                var dependee_info = {};

                var uri = dom_node.getAttribute('src') || dom_node.getAttribute('href');
                var content = dom_node.text;

                if( uri ) {
                    dependee_info.uri = uri;
                }
                else {
                    dependee_info.source_code = content || '';
                }

                if( dom_node.tagName === 'SCRIPT' ) {
                    dependee_info.mime_type = 'application/javascript';
                }

                if( dom_node.tagName === 'STYLE' ||
                    dom_node.tagName === 'LINK' && dom_node.getAttribute('rel').toLowerCase()==='stylesheet' ) {
                    dependee_info.mime_type = 'text/css';
                }

                /*
                if( dom_node.tagName === 'AUDIO' ) {
                    dependee_info.mime_type = 'audio/*';
                }

                if( dom_node.tagName === 'VIDEO' ) {
                    dependee_info.mime_type = 'video/*';
                }

                if( dom_node.tagName === 'IMG' ) {
                    dependee_info.mime_type = 'image/*';
                }
                */

                dependee_info.dom_node = dom_node;

                return dependee_info;
            })
            .filter(function(dependee_info){
                return Object.keys(dependee_info).length > 0;
            });

        window.document.serialize = function(){return new Buffer(jsdom.serializeDocument(window.document))};

        callback(
            dependees_found,
            window.document);

    });

}


function get_mutation_fcts(code__html, document, node_map){

    return {
        removeDependency: removeDependency,
        insertDependencyBefore: insertDependencyBefore
    };

    function removeDependency(code__dependee){

        apply_dom_changes();
        code__html.source_code = new Buffer(document.serialize());
        return code__html.retrieve_dependencies();

        /*
        remove_from_array(code__html, 'dependees', code__dependee);
        remove_from_array(code__html, 'dependees_all', code__dependee);

        function remove_from_array(code__html, key, code__dependee){
            var index = (code__html[key]||[]).indexOf(code__html);
            if( index === -1 ) {
                log.warn("attempted removal failed because can't find `"+code__dependee.id+"` in `"+key+"` of `"+code__html.id+"`");
                return;
            }
            else {
                code__html[key].splice(index, 1);
            }
        }
        */

        function apply_dom_changes(){
            if( (code__dependee||{}).constructor !== CodeInfo ) {
                throw "argument to `"+removeDependency.name+"` needs to be created with `new CodeInfo()`";
            }

            var node = get_node(code__dependee);
            if( node ) {
                try{
                    node.parentElement.removeChild(node);
                }catch(err){
                    log.warn("can't remove dependee `"+code__dependee.id+"` from `"+code__html.id+"` because; "+err);
                }
            }
        }
    }

    function insertDependencyBefore(code__dependee, code__insertion_point){

        apply_dom_changes();
        code__html.source_code = new Buffer(document.serialize());
        return code__html.retrieve_dependencies();

        function apply_dom_changes(){
            if( (code__dependee||{}).constructor !== CodeInfo ||
                code__insertion_point && code__insertion_point.constructor !== CodeInfo ) {
                throw "argument to `"+insertDependencyBefore.name+"` needs to be created with `new CodeInfo()`";
            }

            if( ['text/css', 'application/javascript'].indexOf( code__dependee.mime_type ) === -1 ) {
                throw "can't add dependee `"+code__dependee.id+"` to `"+code__html.id+"` because of its unsupported  mime_type `"+code__dependee.mime_type+"`";
            }

            var node = (function(){
                var path_relative = require('path').relative(require('path').dirname(code__html.location.disk.path), code__dependee.location.disk.path);
                if( code__dependee.mime_type === 'application/javascript' ) {
                    var node;
                    node = document.createElement("script");
                    node.src = path_relative;
                    return node;
                }
                if( code__dependee.mime_type === 'text/css' ) {
                    var node;
                    node = document.createElement("link");
                    node.setAttribute('rel', 'stylesheet');
                    node.href = path_relative;
                    return node;
                }
                assert(false);
            })();

            var anchor_node = search_anchor_node(code__insertion_point, code__dependee.mime_type);

            if( ! anchor_node ) {
                (function(){
                    if( code__dependee.mime_type === 'application/javascript' ) {
                        return document.querySelector('body') || document.documentElement;
                    }
                    if( code__dependee.mime_type === 'text/css' ) {
                        return document.querySelector('head') || document.documentElement;
                    }
                    assert(false);
                })()
                .appendChild(node);
            }
            else {
                anchor_node.parentElement
                .insertBefore(node, anchor_node);
            }

        }

    }

    function get_node(code){
        assert(code && code.constructor === CodeInfo);
        var node = node_map.get(code);
        if( ! node ) {
            warning("can't find DOM node of `"+code.id+"`");
        }
        return node;
    }

    function search_anchor_node(code, mime_type){
        var anchor_code = (function(){
            if( ! code ) {
                return (
                    code__html
                    .dependees
                    .filter(function(dependee_info){
                        return dependee_info.mime_type === mime_type;
                    })
                    .slice(-1)[0]
                );
            }
            for(var i in code__html.dependees) {
                if( code__html.dependees[i] === code )
                    return dep
                for(var j in code__html.dependees[i].dependees_all)
                    if( code__html.dependees[i].dependees_all[j] === code )
                        return code__html.dependees[i];
            }
            return null;
        })();

        return anchor_code && get_node(anchor_code);
    }

    function warning(reason){
        log.warn("can't mutate dependencies of `"+code__html.id+"` because "+reason);
    }

}

