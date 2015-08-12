var assert = require('better-assert');
var path = require('path');
var Builder = require('systemjs-builder');

var Code = require('../code-class.js');


module.exports = function(code, callback){

    assert(code && code.constructor === Code);
    assert(code.filename_extension === 'jspm.js');
    assert(code.path);

    console.log(11, code.uri);

    var systemBuilder = new Builder();

    //systemBuilder.loader.baseURL = code.includer_html.path;
    //systemBuilder.loadConfigSync('src/config.js');

    var main_normalized;

    var keys_normalized = {};

    return (
        System
            .normalize(code.path)
            .then(function(value){
                main_normalized = value; })
            .then(function(){
                console.log(code.includer_html.path,code.path);
                return systemBuilder.trace(code.path); })
            .then(function(tree){

                return Promise
                    .all(
                        Object.keys(tree)
                            .map(function(key){
                                return System.normalize(key)
                                    .then(function(key_normlized){
                                        keys_normalized[key_normlized] = key;
                                    });
                            })
                    )
                    .then(function(){
                        return tree;
                    });
            })
            .then(function(tree){

                var key = keys_normalized[main_normalized];
                /*
                var key =
                    path.relative(
                        path.normalize(systemBuilder.loader.baseURL).replace(/^[^:]*:/,''),
                        code.path);
                */
              //console.log(key, Object.keys(tree));
                var ret = {};
                ret[code.path] = tree[key].deps;
                //callback(ret);

                var dependencies = tree[key].deps;

                dependencies =
                    dependencies.map(function(uri){
                        return new Code({
                            uri: uri,
                            includer: code
                        });
                    });

                callback(dependencies);

            })
    );

}

