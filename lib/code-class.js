// Code Object Class

var assert = require('better-assert');


module.exports = function Code(input){
    assert(input.uri || input.source_code);

    this.uri = input.uri || null;

    this.url = get_url(this);

    this.filename_extension = input.filename_extension || get_filename_extension(this);

    this.includer = input.includer;

    this.includer_html = input.includer_html || get_includer_html(this);

    this.path = get_absolute_path(this);

    this.directory = get_directory(this);

    this.source_code = input.source_code || is_local_file(this) && read_file(this.path) || null;

    this.hash = this.source_code && compute_sha256(this.source_code) || null;

    this.uri = /*this.path || TODO*/ this.uri || ('sha256:'+this.hash);

    this.dependencies = null;

    this.dependencies_all = null;

    assert(this.uri);
    assert(this.includer_html && this.includer_html.constructor === Code);
    assert(this.includer_html === this || this.includer && this.includer.constructor === Code);
    assert(!is_local_file(this) || this.filename_extension, "file "+ this.path +" is missing a filename extension");
    assert(!is_local_file(this) || /^\//.test(this.path));
    assert(!is_local_file(this) || this.directory);
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
    var hash = require('crypto').createHash('sha256');
    hash.update(text);
    return hash.digest('hex');
}

function get_directory(code){
    return (
        code.path && require('path').dirname(code.path) + '/' ||
        is_inline_code(code) && code.includer.directory ||
        null
    );
}

function get_filename_extension(code){
    if( is_url(code) ) return null;
    if( ! code.uri ) return null;
    return code.uri.split('.').pop();
}

function get_includer_html(code){
    if( code.filename_extension === 'html' ) return code;
    if( code.includer ) return code.includer.includer_html; // little Software Design experiment; duplication of data to avoid up-traversal of dependency tree
    return null;
}

function get_absolute_path(code){
    if( ! is_local_file(code) ) return null;

    assert(code.filename_extension !== 'html' || /^\//.test(code.uri), 'uri of html code should be an absolute OS path');

    if( code.filename_extension === 'html' ) return code.uri;

    var is_relative_to_html_dir = /^\//.test(code.uri);
    var base_directory = is_relative_to_html_dir ? code.includer_html.directory : code.includer.directory;

    return require('path').join(base_directory, code.uri);
}

function is_inline_code(code){
    return code.uri === null || code.uri === undefined || /sha256:/.test(code.uri);
}

function is_local_file(code){
    return ! is_inline_code(code) && ! code.url;
}

function get_url(code){
    return this.uri && /^http/.test(this.uri) ? this.uri : null;
}

function is_url(code){
    return get_url(code) !== null;
}
