var retrievers = {
    html: require('./retrievers/html.js'),
    js: require('./retrievers/js.js'),
    css: require('./retrievers/css.js')
};


module.exports = function(baseURL, path, callback){

    var suffix = path.split('.').pop();

    if( ! suffix ) {
        console.log("WARNING; file "+path+" is missing a suffix");
        dependencies[path] = null;
        resolve();
        return;
    }

    if( ! retrievers[suffix] ) {
        console.log("WARNING; can't retrieve dependencies of "+path+"; *."+suffix+" files not supported");
        dependencies[path] = null;
        resolve();
        return;
    }

    retrievers[suffix](baseURL, path, callback);

};
