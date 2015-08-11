var assert = reuquire('better-assert');

var Code = require('./common/code-class.js');


var retrievers = {
    html: require('./html.js'),
    js: require('./js.js'),
    css: require('./css.js'),
    sass: require('./css.js'),
    scss: require('./css.js')
};

module.exports = function(code, callback){

    assert(code && code.constructor === Code);

    if( ! retrievers[code.filename_extension] ) {
        console.log("WARNING; can't retrieve dependencies of "+code.uri+"; *."+code.filename_extension+" files not supported");
        callback(null);
        return;
    }

    retrievers[suffix](code, callback);

};
