// Code Object Class
// - every piece of code is represented by an instance of this Code Class
// - cumulates and holds information about the piece of code inlcuding dependencies

var assert = require('better-assert');

var log = require('./log.js');


module.exports = Code;

function Code(code_info){

    assert(code_info.uri || code_info.source_code);

    Object.assign(
        this ,
        code_info ,
        {uri:undefined, path:undefined} );

    this.includer = this.includer || null;

    this.type = this.type || get_type(code_info.uri, this.includer);

    this.location = new Location({
        type: this.type,
        uri: code_info.uri,
        path: code_info.path,
        includer: this.includer
    });

    this.source_code = this.source_code || fetch(this.location) || null;
    this.hash = this.source_code && compute_sha256(this.source_code) || null;

    this.id = get_id(this);

    this.dependencies = this.dependencies || null;
    this.dependencies_all = null;

    this.pipeline_executed = false;

}

function Location(code_info){

    this.uri = code_info.uri;

    this.disk = {
        path: null,
        base: null,
        path_relative_to_base: null,
        directory: null
    };

    this.internet = {
        url: null
    };


    var is_inline_code = ! this.uri;
    if( is_inline_code ) {
        assert( code_info.includer );
        assert( code_info.includer.location.disk.directory );
        this.disk.directory = code_info.includer.location.disk.directory;
        return;
    }

    if( is_url(this.uri, code_info.includer) ) {
        this.internet.url = get_url(code_info.uri, code_info.includer) ;
    }
    else {
        this.disk.path =
            code_info.path
            || get_path(this.uri, code_info.includer) ;

        assert(this.disk.path);

        this.disk.directory =
            require('path').dirname(this.disk.path) ;

        this.disk.base =
            get_base(this.disk.directory, code_info.includer);

        this.disk.path_relative_to_base =
            get_relative(this.disk.base, this.disk.path) ;
    }



    // addresses are absolute
    assert( this.disk.path === null || require('path').parse(this.disk.path).root );
    assert( this.internet.url === null || parse_url(this.internet.url).host );

    // directory should always exist
    assert( this.disk.path === null || this.disk.directory );

    // inline code are CSS/JS code snippets in .html files
    // there is no situation where an inline code contains inline code
    // inline code <~> this.disk.path === null && this.internet.url === null
    assert( this.disk.path !== null || this.internet.url !== null || code_info.includer.location.disk.path !== null || code_info.includer.location.internet.url !== null );

    return this;

    function get_url(uri, includer){
        var uri__as_url = parse_url(uri);

        assert( uri__as_url.host || includer );

        if( uri__as_url.host ) {
            return uri__as_url.href;
        }

        if( includer ) {
            assert( includer.location.internet.url );
            return require('url').resolve(
                includer.location.internet.url,
                uri);
        }

        assert( false );

        return null;
    }

    function get_path(uri, includer){

        var uri__as_path = require('path').parse(uri);

        if( ! includer ) {

            // "entry point code"

            if( uri__as_path.root ) {
                return uri;
            }
            else {
                var absolute_path = require('path').resolve(process.cwd(), uri);
                assert( require('path').parse(absolute_path).root );
                return absolute_path;
            }

        }
        else {

            // URI relates to "entry point code"

            var related_includer =
                !! uri__as_path.root ?
                    get_root_includer(includer) :
                    includer ;

            assert( related_includer && related_includer.location.disk.path );

            return require('path').join(
                       related_includer.location.disk.directory ,
                       uri );

        }

    }

    function get_base(directory, includer){
        if( ! includer ) {
            return directory;
        }
        else {
            var root_includer = get_root_includer(includer);
            assert( root_includer.location.disk.directory );
            return root_includer.location.disk.directory;
        }
    }

    function get_relative(base, path_absolute){
        return require('path').relative(base, path_absolute);
    }

    function get_root_includer(includer){
        var root_includer = includer;
        var stop = 1000;
        while( root_includer.includer ) {
            root_includer = root_includer.includer;
            if( !stop-- ) throw 'infinite code.includer.includer... loop ?'
        }

        return root_includer;
    }

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

function get_type(uri, includer){
    if( ! is_url(uri, includer) ) return get_suffix(uri);

    var suffix = get_suffix(parse_url(uri).path);
    if( suffix === 'php' ) return 'html';
    if( suffix ) return suffix;
    return 'html';

    function get_suffix(str){
        var dot_split = str.split('.');
        return dot_split.length > 1 ? dot_split.pop() : null;
    }
}

function is_url(uri, includer){
    assert(uri);

    var uri__as_url = parse_url(uri);
    var uri__as_path = require('path').parse(uri);

    // first entry code should be either an absolute url or an absolute path
    assert( includer || uri__as_url.host || uri__as_path.root );

    if( uri__as_url.host )
        return true;

    if( includer )
        return !! includer.location.internet.url;

    assert( uri__as_path.root );

    return false;
}

function get_id(code){
        return code.location.disk.path_relative_to_base || code.location.internet.url || code.location.uri || code.hash;
}

function parse_url(url){
    // handles protocol relative URLs
    // see https://github.com/joyent/node/issues/9123
    if( !/^\/\//.test(url) ) {
        var info =
            require('url').parse(url);
        return {
            host: info.host,
            href: info.href,
            path: info.path
        };
    }
    var info =
        require('url').parse(
            require('url').resolve(
                'http://example.org' ,
                url ));
    return {
        host: info.host.replace(/^http:/, ''),
        href: info.href.replace(/^http:/, ''),
        path: info.path
    };
}
