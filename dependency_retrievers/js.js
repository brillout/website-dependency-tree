var Builder = require('systemjs-builder');

var path = require('path');

module.exports = function(baseURL, main, callback){

    var systemBuilder = new Builder();

    systemBuilder.loader.baseURL = baseURL;
    //systemBuilder.loadConfigSync('src/config.js');

    var main_normalized;

    var keys_normalized = {};

    return (
        System
            .normalize(main)
            .then(function(value){
                main_normalized = value; })
            .then(function(){
                return systemBuilder.trace(main); })
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

                var ret = {};

                var key = keys_normalized[main_normalized];
                /*
                var key =
                    path.relative(
                        path.normalize(systemBuilder.loader.baseURL).replace(/^[^:]*:/,''),
                        main);
                */
              //console.log(key, Object.keys(tree));
                ret[main] = tree[key].deps;

                //callback(ret);

                callback(tree[key].deps);

            })
    );
}

