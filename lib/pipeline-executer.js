var assert = require('better-assert');


module.exports = function(){
    var executing_pipeline = false;
    return function(pipeline_segment){

        var code = this;

        var start_position =
            pipeline_segment && pipeline_segment.start && code.pipeline_workers.indexOf( pipeline_segment.start )
            || 0 ;
        assert( start_position !== -1 );
        var end_position =
            pipeline_segment && pipeline_segment.end && code.pipeline_workers.indexOf( pipeline_segment.end )
            || code.pipeline_workers.length - 1 ;
        assert( end_position !== -1 );

        // avoid infinite loop in case of cyclic dependencies
        if( executing_pipeline ) {
            return Promise.resolve();
        };
        executing_pipeline = true;

        var resolve_promise;
        var reject_promise;
        var promise = new Promise(function(resolve, reject){resolve_promise=resolve;reject_promise=reject});

        run_worker(start_position);

        return promise;


        function run_worker(i){

            if( i > end_position ) {
                // we are done
                executing_pipeline = false;
                resolve_promise();
                return;
            }

            var worker = code.pipeline_workers[i];

            assert( worker.length <= 2 );
            if( worker.length < 2 ) {
                worker(code);
                run_worker(i+1);
            }
            else {
                var timeout = catch_slow_worker(worker);
                worker(code, function(){
                    clearTimeout(timeout);
                    run_worker(i+1);
                });
            }

        }

        function catch_slow_worker(worker){
            // hacky solution for now for inherently slow recursive worker
            var TIMEOUT = worker.name === 'recursively_execute_pipeline' ? 10*60*1000 : 6000;
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
                TIMEOUT);
        }
    };
};

