// Code Object Class
// - a piece of code is represented by an instance of this Code Class
// - cumulates and holds information about the piece of code inlcuding its dependencies

var assert = require('better-assert');
var log = require('mini-log');

module.exports = Code;

var cache = require('./cache.js');
var workers = {
    input:
        require('./workers/input.js'),
    location:
        require('./workers/location.js'),
    dependency:
        require('./workers/dependency.js'),
    dependency_retrievers: {
        html: require('./workers/retrievers/html.js'),
        css: require('./workers/retrievers/css.js'),
        jspm: require('./workers/retrievers/jspm.js'),
        requirejs: require('./workers/retrievers/requirejs.js')
    }
};


function Code(input, skip_cache_and_pipeline){

    this.last_inclusion = {
        uri: null,
        includer: null
    };
    this.root_includer = null;
    this.location = {
        disk: {
            path: null,
            directory: null
        },
        internet: {
            url: null,
            path: null,
            is_cross_domain: null
        }
    };
    this.mutation = {
        removeDependency: null,
        insertDependencyBefore: null
    };
    this.source_code = null;
    this.mime_type = null;
    this.module_format = null;
    this.id = null;
    this.name = null;
    this.dependencies = null;
    this.dependencies_all = null;

    var that = this;
    Object.defineProperty(this, 'includers', {get: function(){
        return (
            cache
            .get_all_cached_entries()
            .filter(function(code){
                return (code.dependencies||[]).indexOf(that) !== -1;
            })
        )
    }});

    this.retrieve_dependencies = function(){
        return this._execute_pipeline({start: break_});
    };

    this._last_input = input;
    if( skip_cache_and_pipeline ) {
        var code = this;
    }
    else {
        var code = cache.cache(this);
        code._last_input = input;
        code._execute_pipeline({end: break_});
    }
    return code;

}

function break_(){}

Code.prototype.pipeline_workers =
    []
    .concat(
        workers.input.validate_input,
        workers.input.assign_input,
        workers.input.set_root_includer,

        workers.location.set_internet_location,
        workers.location.set_disk_location,
        workers.location.validate_location,

        workers.input.set_source_code,
        workers.input.set_id,
        workers.input.set_name,
        workers.input.deduce_mime_type,

        break_,

        workers.dependency.clean,
        workers.dependency_retrievers.html,
        workers.dependency_retrievers.css,
        workers.dependency_retrievers.jspm,
        workers.dependency_retrievers.requirejs,

        workers.dependency.recurse,

        workers.dependency.compute_transitive_closure, // flatten dependency tree into one array `code.dependencies_all`
        workers.dependency.prune_self_dependency // remove self dependencies
    );

Code.prototype._execute_pipeline = function(pipeline_segment){

        var code = this;

        var start_position =
            pipeline_segment && pipeline_segment.start && code.pipeline_workers.indexOf( pipeline_segment.start )
            || 0 ;
        assert( start_position !== -1 );
        var end_position =
            pipeline_segment && pipeline_segment.end && code.pipeline_workers.indexOf( pipeline_segment.end )
            || code.pipeline_workers.length - 1 ;
        assert( end_position !== -1 );

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
            var TIMEOUT = worker === workers.dependency.recurse ? 10*60*1000 : 6000;
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
