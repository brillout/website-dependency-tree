// wrong results on jspm_packages/system.js

var assert = require('better-assert');
var precinct = require('precinct');

var Code = require('../code-class.js');


module.exports = function(code, callback){

    assert(code && code.constructor === Code);
    assert(code.filename_extension === 'js');
    assert(code.path);

    var dependencies = precinct.paperwork(code.path);

    dependencies =
        dependencies.map(function(uri){
            return new Code({
                uri: uri,
                includer: code
            });
        });

    callback(dependencies);

};
