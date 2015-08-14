// wrong results on jspm_packages/system.js

var assert = require('better-assert');
var precinct = require('precinct');


module.exports = function(code, callback){

    var Code = require('../code-class.js');

    assert(code && code.constructor === Code);
    assert(code.filename_extension);

    if( true/*code.filename_extension !== 'js'*/ ) {
        callback();
        return;
    }

    assert(code.path);

    get_dependencies(code.path, function(dependencies_found){

        code.dependencies =
            (code.dependencies||[])
            .concat(
                dependencies_found
                .map(function(uri){
                    return new Code({
                        uri: uri,
                        includer: code
                    });
                }));

        callback();
    });



};

function get_dependencies(path, callback){

    var dependencies_found = precinct.paperwork(path);
    callback(dependencies_found);

};
