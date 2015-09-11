// Code Object Class
// - every piece of code is represented by an instance of this Code Class
// - cumulates and holds information about the piece of code inlcuding dependencies

var assert = require('better-assert');
var log = require('mini-log');
var Location = require('./location-class.js');


module.exports = Code;

function Code(input){

    validate_input(input);

    Object.assign(this, input);


    this.includer = this.includer || null;

    this.location = new Location({
        uri: (this.location||{}).uri,
        path: (this.location||{}).path,
        includer: this.includer
    });

    this.source_code = this.source_code || fetch(this.location) || null ;

    this.mime_type = this.mime_type || get_mime_type(this.location) || null ;

    this.module_loader = this.module_loader || null ;

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

function validate_input(input){
    var err_str = "define uri on location property not root; `new Code({location: {uri:'/bla.html'}})`";
    if( input.uri ) throw err_str;
    if( input.path ) throw err_str.replace('uri','path');
    assert(typeof(input.source_code) !== 'undefined' || (input.location||{}).uri);
    assert(input.includer || (input.location||{}).uri);
}

function get_id(code){
    var same_host = code.include
    return (
        code.location.disk.path_relative_to_base ||
        code.location.internet[code.location.internet.cross_domain===false?'path':'url'] ||
        code.location.uri ||
        compute_sha256(code.source_code)
    );
}

function fetch(location){
    if( location.disk.path ) {
        try{
            return require('fs').readFileSync(location.disk.path);
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
                require('sync-request')('GET', url)
                .getBody();
            log.verbose.ok("fetch `"+url+"`");
            return body;
        }catch(e) {
            log.warn("can't fetch `"+location.internet.url+"`. Reason: "+e);
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

function get_mime_type(location){
    // require('mime') uses a DB, alternatively use MIME-sniffing instead since we already have the source code
    var mime = require('mime');

    var path =  location.internet.path || location.disk.path;
    assert( path );

    var mime_type = mime.lookup(path);

    if( mime_type === mime.default_type && location.internet.path ) {
        mime_type = mime.lookup(deduce_extension(location.internet.path));
    }

    if( mime_type === mime.default_type ) {
        return null;
    }

    return mime_type;


    function deduce_extension(internet_path){
        var suffix = get_suffix(internet_path);

        // require('mime').lookup('file.php') === require('mime').default_type
        if( suffix === 'php' ) return '.html';

        if( ! suffix ) return '.html';

        return '.'+suffix;

        function get_suffix(str){
            var dot_split = str.split('.');
            return dot_split.length > 1 ? dot_split.pop() : null;
        }
    }
}

