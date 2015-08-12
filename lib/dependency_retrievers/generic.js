var assert = require('better-assert');

var Code = require('../code-class.js');


var retrievers = {
    html: require('./html.js'),
    //js: require('./require.js'),
    js: require('./js.js'),
    'jspm.js': require('./jspm.js'),
    css: require('./css.js'),
    sass: require('./css.js'),
    scss: require('./css.js')
};

module.exports = function(code, callback){

    assert(code && code.constructor === Code);

    if( ! code.source_code && code.filename_extension !== 'jspm.js' ) { // hacky / TODO
        console.log("WARNING -- can't retrieve dependencies of "+code.uri+" -- source code missing (fetching code over network currently not supported)");
        callback(null);
        return;
    }

    if( ! retrievers[code.filename_extension] ) {
        console.log("WARNING -- can't retrieve dependencies of "+code.uri+" -- *."+code.filename_extension+" files not supported");
        callback(null);
        return;
    }

    var timeout = setTimeout(function(){
        throw new Error('callback not called when retrieving dependencies of '+code.uri);
    },2000);

    retrievers[code.filename_extension](code, function(){
        clearTimeout(timeout);
        callback.apply(null, arguments);
    });

};
