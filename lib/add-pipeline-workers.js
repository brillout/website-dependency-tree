var Code = require('./code-class.js');

var retrievers = [
    require('./dependency_retrievers/html.js'),
    require('./dependency_retrievers/require.js'),
    require('./dependency_retrievers/js.js'),
    require('./dependency_retrievers/jspm.js'),
    require('./dependency_retrievers/css.js')
];

var cache = {};
function recursively_execute_pipeline(code, callback) {

    console.log(1);
    code.dependencies =
        code.dependencies
        .map(function(code){
            assert(code && code.constructor === Code);
            assert(code.id);
            return cache[code.id] = cache[code.id] || code;
        });

    Promise.all(
        code.dependencies
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

Code.prototype.pipeline =
    Code.prototype.pipeline.concat( retrievers );

Code.prototype.pipeline.push( recursively_execute_pipeline );
