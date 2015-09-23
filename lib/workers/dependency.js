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
        (code.dependees||[])
        .map(function(dependee){
            // avoid infinite loop in case of cyclic dependees
            if( dependee._recursion_called )
                return Promise.resolve();
            return dependee.retrieve_dependencies();
        })
    )
    .then(function(){
        delete code._recursion_called;
        done();
    });

}

function compute_transitive_closure(code){

    code.dependees_all =
        (code.dependees||[])
        .map(function(code){
            return [code]
                   .concat( code.dependees_all || [] );
        })
        .reduce(function(left, right){ return left.concat(right) },[]) ;

}

function prune_self_dependency(code) {
    code.dependees = remove_self(code.dependees);
    code.dependees_all = remove_self(code.dependees_all);

    function remove_self(array){
        return array &&
            array
            .filter(function(dependee){
                assert( (dependee === code) === (dependee.id === code.id) );
                return dependee !== code;
            });
    }
}

function clean(code) {
    (code.dependees||[]).length = 0;
    (code.dependees_all||[]).length = 0;
}

