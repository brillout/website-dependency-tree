var assert = require('better-assert');

var Code = require('./code-class.js');


Code.prototype.pipeline_workers.push( clean );
Code.prototype.pipeline_workers =
    Code.prototype.pipeline_workers.concat(
        require('./retrievers/html.js'),
        require('./retrievers/require.js'),
        require('./retrievers/jspm.js'),
        require('./retrievers/css.js')
    );
Code.prototype.pipeline_workers.push( use_cache );
Code.prototype.pipeline_workers.push( recursively_execute_pipeline );
Code.prototype.pipeline_workers.push( compute_transitive_closure );
Code.prototype.pipeline_workers.push( prune_self_dependency );


// a cache is necessary to avoid an infinite loop in case of cyclic dependencies
var cache = {};
function use_cache(code, done) {

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

// construct the dependency tree
function recursively_execute_pipeline(code, done) {

    Promise.all(
        (code.dependencies||[])
        .map(function(dependency_code){
            // the recursion happens here,
            // i.e. `recursively_execute_pipeline()` will be called
            // when calling `execute_pipeline()`
            return dependency_code.execute_pipeline();
        })
    )
    .then(function(){
        done();
    });

}

// flatten dependency tree into one array `code.dependencies_all`
function compute_transitive_closure(code, done){

    code.dependencies_all =
        (code.dependencies||[])
        .map(function(code){
            return [code]
                   .concat( code.dependencies_all || [] );
        })
        .reduce(function(left, right){ return left.concat(right) },[]) ;

    done();

}

// remove self dependencies
function prune_self_dependency(code, done) {
    code.dependencies = remove_self(code.dependencies);
    code.dependencies_all = remove_self(code.dependencies_all);

    done();

    function remove_self(array){
        return array &&
            array
            .filter(function(dependency_code){
                assert( (dependency_code === code) === (dependency_code.id === code.id) );
                return dependency_code !== code;
            });
    }
}

function clean(code, done) {
    (code.dependencies||[]).length = 0;
    (code.dependencies_all||[]).length = 0;

    done();
}
