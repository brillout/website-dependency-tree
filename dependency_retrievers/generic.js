var retrievers = {
    html: require('./html.js'),
    js: require('./js.js'),
    css: require('./css.js'),
    sass: require('./css.js'),
    scss: require('./css.js')
};


module.exports = function(html_path, path, callback){

    var suffix = path.split('.').pop();

    if( ! suffix ) {
        console.log("WARNING; file "+path+" is missing a suffix");
        callback(null);
        return;
    }

    if( ! retrievers[suffix] ) {
        console.log("WARNING; can't retrieve dependencies of "+path+"; *."+suffix+" files not supported");
        callback(null);
        return;
    }

    retrievers[suffix](html_path, path, callback);

};
