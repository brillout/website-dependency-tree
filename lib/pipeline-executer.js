module.exports = function(){
    var executing_pipeline = false;
    return function(){
        var code = this;

        // avoid infinite loop in case of cyclic dependencies
        if( executing_pipeline ) {
            return Promise.resolve();
        };
        executing_pipeline = true;

        run_worker(0);

        var resolve_promise;
        var reject_promise;
        return new Promise(function(resolve, reject){resolve_promise=resolve;reject_promise=reject});

        function run_worker(i){

            var worker = code.pipeline_workers[i];

            if( ! worker ) {
                // we are done
                executing_pipeline = false;
                resolve_promise();
                return;
            }

            var timeout = catch_slow_worker(worker);
            worker(code, function(){
                clearTimeout(timeout);
                run_worker(i+1);
            });

        }

        function catch_slow_worker(worker){
            return setTimeout(
                function(){

                    var info_about_worker = (function(){ 
                        // http://stackoverflow.com/questions/16697791/nodejs-get-filename-of-caller-function
                        // http://stackoverflow.com/questions/13227489/how-can-one-get-the-file-path-of-the-caller-function-in-node-js
                        // http://stackoverflow.com/questions/14172455/get-name-and-line-of-calling-function-in-node-js
                        var prepareStackTrace_original = Error.prepareStackTrace;
                        Error.prepareStackTrace = function (err, stack) { return stack; };
                        try{
                            worker(); // this is likely to throw an error because of missing arguments
                        }catch(e){
                            var fct = e.stack.shift();
                            var info = '[ ' + fct.getFunctionName() + ' (' + fct.getFileName() + ':' + fct.getLineNumber() + ':' + fct.getColumnNumber() + ')' +' ]';
                        }
                        Error.prepareStackTrace = prepareStackTrace_original;
                        return info;
                    })(); 

                    reject_promise(
                        '`done()` not called within '+TIMEOUT+'ms' +
                        ' when going through '+(code.pipeline_workers.indexOf(worker)+1)+'th pipline worker\n' +
                        '      ' + info_about_worker + '\n' +
                        ' on\n' +
                        '      `' + code.id + '`');

                } ,
                // hacky solution for now for inherently slow recursive worker
                worker.name === 'recursively_execute_pipeline' ? 10*60*1000 : 6000 );
        }
    };
};
