// Code Object Class
// every code is hold by an instance of this `Code` Class

var assert = require('better-assert');


module.exports = Code;

function Code(input){

    assert(input.uri || input.source_code);


    this.uri = input.uri || null;

    this.url = get_url(this);

    this.type = input.type || get_type(this);

    this.includer = input.includer;

    this.includer_html = input.includer_html || get_includer_html(this);

    this.path = get_absolute_path(this);

    this.directory = get_directory(this);

    this.source_code = input.source_code || is_local_file(this) && read_file(this.path) || null;

    this.hash = this.source_code && compute_sha256(this.source_code) || null;

    this.id = get_id(this);

    this.dependencies = null;

    this.dependencies_all = null;

    this.pipeline_executed = false;


    assert(this.id);
    assert(!is_local_file(this) || this.type, "file "+ this.uri +" is missing a type");
    assert(this.path === null || /^\//.test(this.path));
    assert(this.path === null || this.directory);
    assert(this.path === null || is_local_file(this));
    assert(this.includer_html === null || this.includer_html.constructor === Code);
    assert(this.includer_html === null || this.includer_html === this || this.includer && this.includer.constructor === Code);

};

Code.prototype.pipeline_workers = [];
Code.prototype.execute_pipeline = function(callback){
    var code = this;

    // avoid infinite loop in case of cyclic dependencies
    if( code.pipeline_executed ) {
        callback();
        return;
    };
    code.pipeline_executed = true;

    go_through(0);

    function go_through(i){
        var worker = code.pipeline_workers[i];
        if( !worker ) {
            callback();
            return;
        }
        var timeout = setTimeout(function(){
            throw new Error('`done()` not called when going through '+(i+1)+'th pipline worker on '+code.id);
        },2000);
        worker(code, function(){
            clearTimeout(timeout);
            go_through(i+1);
        });
    }
};


function read_file(path){
    try{
        return require('fs').readFileSync(path).toString();
    }catch(e) {
        // console.log("WARNING; there is a dependency to "+path+" but this doesn't point to a file");
        return null;
    }
}

function compute_sha256(text){
    var algorithm = 'sha256';
    var hash = require('crypto').createHash(algorithm);
    hash.update(text);
    return algorithm + ':' + hash.digest('hex');
}

function get_directory(code){
    return (
        code.path && require('path').dirname(code.path) + '/' ||
        is_inline_code(code) && code.includer.directory ||
        null
    );
}

function get_type(code){
    if( is_url(code) ) return null;
    if( ! code.uri ) return null;
    return code.uri.split('.').pop();
}

function get_includer_html(code){
    if( code.type === 'html' ) return code;
    if( code.includer ) return code.includer.includer_html; // little Software Design experiment; duplication of data to avoid up-traversal of dependency tree
    return null;
}

function get_absolute_path(code){
    if( ! is_local_file(code) ) return null;

    if( code.type === 'html' ) {
        assert(/^\//.test(code.uri), 'uri of html code should be an absolute OS path');
        return code.uri;
    }

    var is_relative_to_html_dir = /^\//.test(code.uri);
    var base_directory = is_relative_to_html_dir ? (code.includer_html||{}).directory : (code.includer||{}).directory;

    if( !base_directory ) {
        return !code.includer ? code.uri : null;
    }

    return require('path').join(base_directory, code.uri);
}

function is_local_file(code){
    return ! is_inline_code(code) && ! is_url(code);
}

function is_inline_code(code){
    return ! code.uri;
}

function get_url(code){
    return code.uri && /^http/.test(code.uri) ? code.uri : null;
}

function is_url(code){
    return get_url(code) !== null;
}

function get_id(code){
    Object.observe(code, function(changes) {
        var changes_not_relevant = changes.every(function(change){return ['url', 'path', 'uri', 'hash'].indexOf(change.name) === -1 });
        if( changes_not_relevant ) return;
        code.id = compute(); // ugly dependance with LOC `this.id = get_id(this);`, but makes code more readable
    });

    return compute();

    function compute(){
        return code['url'] || code['path'] || code['uri'] || code['hash'];
    }
}
