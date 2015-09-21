var assert = require('better-assert');


module.exports = {
    recurse: recurse,
    compute_transitive_closure: compute_transitive_closure,
    prune_self_dependency: prune_self_dependency,
    clean: clean
};


function recurse(code, done) {

    code._recursion_called = true;

    Promise.all(
        (code.dependencies||[])
        .map(function(dependency_code){
            // avoid infinite loop in case of cyclic dependencies
            if( dependency_code._recursion_called )
                return Promise.resolve();
            return dependency_code.retrieve_dependencies();
        })
    )
    .then(function(){
        delete code._recursion_called;
        done();
    });

}

function compute_transitive_closure(code){

    code.dependencies_all =
        (code.dependencies||[])
        .map(function(code){
            return [code]
                   .concat( code.dependencies_all || [] );
        })
        .reduce(function(left, right){ return left.concat(right) },[]) ;

}

function prune_self_dependency(code) {
    code.dependencies = remove_self(code.dependencies);
    code.dependencies_all = remove_self(code.dependencies_all);

    function remove_self(array){
        return array &&
            array
            .filter(function(dependency_code){
                assert( (dependency_code === code) === (dependency_code.id === code.id) );
                return dependency_code !== code;
            });
    }
}

function clean(code) {
    (code.dependencies||[]).length = 0;
    (code.dependencies_all||[]).length = 0;
}

