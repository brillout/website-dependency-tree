var assert = require('better-assert');


module.exports = {
    compute_transitive_closure: compute_transitive_closure,
    prune_self_dependency: prune_self_dependency,
    clean: clean
};


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

