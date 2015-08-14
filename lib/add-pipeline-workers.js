var assert = require('better-assert');

var Code = require('./code-class.js');


Code.prototype.pipeline_workers =
    Code.prototype.pipeline_workers.concat(
        require('./retrievers/html.js'),
        require('./retrievers/require.js'),
        require('./retrievers/js-es2015ml.js'),
        require('./retrievers/jspm.js'),
        require('./retrievers/css.js')
    );
Code.prototype.pipeline_workers.push( recursively_execute_pipeline );
Code.prototype.pipeline_workers.push( compute_transitive_closure );


// a cache is necessary to avoid an infinite loop in case of cyclic dependencies
var cache = {};
function use_cache(code, callback) {

    code.dependencies =
        code.dependencies &&
        code.dependencies
        .map(function(code){
            assert(code && code.constructor === Code);
            assert(code.id);
            return cache[code.id] = cache[code.id] || code;
        });

    callback();

}

function recursively_execute_pipeline(code, callback) {

    Promise.all(
        (code.dependencies||[])
        .map(function(code){
            return new Promise(function(resolve){
                // the recursion happens here,
                // i.e. `recursively_execute_pipeline()` will be called
                // when calling `execute_pipeline()`
                code.execute_pipeline(function(){resolve()});
            })
        })
    )
    .then(function(){
        callback();
    });

}

function compute_transitive_closure(code, callback){

    code.dependencies_all =
        code.dependencies &&
        []
        .concat(
            code.dependencies)
        .concat(
            code.dependencies
            .map(function(code){
                return code.dependencies_all || [];
            })
            .reduce(function(left, right){
                return left.concat(right)
            },[]));

    callback();

}
