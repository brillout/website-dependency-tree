module.exports = {
    recurse_execution: recurse_execution,
};


function recurse_execution(code, done) {

    Promise.all(
        (code.dependencies||[])
        .map(function(dependency_code){
            // the recursion happens here,
            // i.e. `recurse()` will be called
            // when calling `execute_pipeline()`
            return dependency_code.execute_pipeline();
        })
    )
    .then(function(){
        done();
    });

}

