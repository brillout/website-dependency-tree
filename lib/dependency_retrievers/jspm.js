var jspm = require('jspm');

var Code = require('../code-class.js');


var systemBuilder = new jspm.Builder();

module.exports = function(code, callback){
    return systemBuilder
        .trace(code.uri)
        .then(function(tree){

            var dependencies = tree[code.uri].deps;

            dependencies =
                dependencies.map(function(uri){
                    return new Code({
                        uri: uri,
                        filename_extension: 'jspm.js',
                        includer: code
                    });
                });

            callback(dependencies);

            /*
            // compute transitive closure
            var asset_names = new Set();
            var dep_tree = systemBuilder.getDepCache(tree);
            for(var dependant in dep_tree) {
                asset_names.add(dependant);
                dep_tree[dependant].forEach(function(dependency){
                    asset_names.add(dependency);
                });
            }

            // expose required information
            return (
                Array
                    .from(asset_names)
                    .map(function(asset_name){
                        return {
                            name: asset_name,
                            path: '/'+tree[asset_name].address.replace(systemBuilder.loader.baseURL,''),
                            source: tree[asset_name].metadata.originalSource || tree[asset_name].source
                        };
                    })
            )
            */

        })
        .catch(function(err){ console.error(new Error(err).stack); throw new Error(err) })
}

