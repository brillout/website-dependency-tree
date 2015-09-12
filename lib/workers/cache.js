var assert = require('better-assert');
var Code = require('../code-class.js');


module.exports = {
    use_cache: use_cache
};

var cache = {};

function use_cache(code, done){
    assert(code.id);
    cache[code.id] = code;

    code.dependencies =
        code.dependencies &&
        code.dependencies
        .map(function(dependency_code){
            assert(dependency_code && dependency_code.constructor === Code);
            assert(dependency_code.id);
            return cache[dependency_code.id] || dependency_code;
        });

    done();
}
