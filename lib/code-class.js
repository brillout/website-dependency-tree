// Code Object Class
// - every piece of code is represented by an instance of this Code Class
// - cumulates and holds information about the piece of code inlcuding dependencies

var assert = require('better-assert');
var log = require('./log.js');
var Location = require('./location-class.js');


module.exports = Code;

function Code(input){

    assert(input.uri || input.source_code);

    Object.assign(
        this ,
        input ,
        {uri:undefined, path:undefined} );

    this.includer = this.includer || null;

    this.location = new Location({
        uri: input.uri,
        path: input.path,
        includer: this.includer
    });

    this.type = this.type || get_type(this.location.disk.path, this.location.internet.path);

    this.source_code = this.source_code || fetch(this.location) || null;
    // this.hash = this.source_code && compute_sha256(this.source_code) || null;

    this.id = get_id(this);

    this.dependencies = this.dependencies || null;
    this.dependencies_all = null;

    this.pipeline_executed = false;

}

Code.prototype.pipeline_workers = [];
Code.prototype.execute_pipeline = function(callback){
    var code = this;

    // avoid infinite loop in case of cyclic dependencies
    if( code.pipeline_executed ) {
        callback();
        return;
    };
    code.pipeline_executed = true;

    run_worker(0);

    function run_worker(i){
        var worker = code.pipeline_workers[i];
        if( !worker ) {
            callback();
            return;
        }

        var TIMEOUT = 6000;
        // hacky solution for now
        if( worker.name === 'recursively_execute_pipeline' ) {
            TIMEOUT += 10*60*1000;
        }

        var timeout = setTimeout(function(){

            var worker_info = (function(){ 
                // http://stackoverflow.com/questions/16697791/nodejs-get-filename-of-caller-function
                // http://stackoverflow.com/questions/13227489/how-can-one-get-the-file-path-of-the-caller-function-in-node-js
                // http://stackoverflow.com/questions/14172455/get-name-and-line-of-calling-function-in-node-js
                var prepareStackTrace_original = Error.prepareStackTrace;
                Error.prepareStackTrace = function (err, stack) { return stack; };
                try{
                    worker();
                }catch(e){
                    var fct = e.stack.shift();
                    var info = '[ ' + fct.getFunctionName() + ' (' + fct.getFileName() + ':' + fct.getLineNumber() + ':' + fct.getColumnNumber() + ')' +' ]';
                }
                Error.prepareStackTrace = prepareStackTrace_original;
                return info;
            })(); 

            log.err(
                '`done()` not called within '+TIMEOUT+ 'ms when going through '+(i+1)+'th pipline worker\n' +
                '      ' + worker_info + '\n' +
                ' on\n' +
                '      `' + code.id + '`');

        },TIMEOUT);
        worker(code, function(){
            clearTimeout(timeout);
            run_worker(i+1);
        });
    }
};


function fetch(location){
    if( location.disk.path ) {
        try{
            return require('fs').readFileSync(location.disk.path).toString();
        }catch(e) {
            log.warn("can't read `"+location.disk.path+"` but it has been found to be a dependency");
            return null;
        }
    }
    if( location.internet.url ) {
        var url = location.internet.url.replace(/^\/\//, 'http://');
        log.verbose.calc("fetch `"+url+"`");
        try{
            var body =
                require('sync-request')(
                    'GET',
                    url)
                        .getBody()
                        .toString();
            log.verbose.ok("fetch `"+url+"`");
            return body;
        }catch(e) {
            log.warn("can't fetch `"+location.internet.url+"`");
            return null;
        }
    }
    return null;
}

function compute_sha256(text){
    var algorithm = 'sha256';
    var h = require('crypto').createHash(algorithm);
    h.update(text);
    return algorithm + ':' + h.digest('hex');
}

function get_type(disk_path, internet_path){
    if( disk_path ) return get_suffix(disk_path);

    var suffix = get_suffix(internet_path);
    if( suffix === 'php' ) return 'html';
    if( suffix ) return suffix;
    return 'html';

    function get_suffix(str){
        var dot_split = str.split('.');
        return dot_split.length > 1 ? dot_split.pop() : null;
    }
}

function get_id(code){
        return code.location.disk.path_relative_to_base || code.location.internet.url || code.location.uri || code.hash;
}

