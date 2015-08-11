// Code Object Class

var assert = require('better-assert');


module.exports = function Code(input){
    assert(input.uri || input.source_code);

    this.uri = input.uri;

    this.filename_extension = input.filename_extension || get_filename_extension(this.uri);

    this.includer = input.includer;

    this.includer_html = input.includer_html || get_includer_html(this);

    this.path = (input.uri && !/^http/.test(input.uri)) ? get_absolute_path(this) : null;

    if( this.path ) { // local file
        this.uri = this.path;

        this.directory = get_directory(this.path);

        this.source_code = read_file(this.path);
    }

    this.source_code = input.source_code || this.source_code;

    this.hash = compute_sha256(this.source_code);

    if( ! this.uri ) {
        this.uri = 'sha256:'+this.hash;
    }

    this.dependencies = null;

    assert(this.uri);
    assert(this.filename_extension, "file "+ this.path +" is missing a filename extension");
    assert(this.source_code);
    assert(this.hash);
    assert(this.includer_html && this.includer_html.constructor === Code);
    assert(this.includer_html === this || this.includer && this.includer.constructor === Code);
    if( this.path ) {
        assert(this.path && /^\//.test(path));
        assert(this.directory);
    }
};

function read_file(path){
    var fs = require('fs');
    /*
    try{
        var read = fs.readFileSync(path);
    }catch(e) {
        console.log("WARNING; there is a dependency to "+path+" but this doesn't point to a file");
    }
    */
    var read = fs.readFileSync(path);
    return path && read.toString();
}

function compute_sha256(text){
    var crypto = require('crypto');
    var hash = crypto.createHash('sha256');
    hash.update(data);
    var digest = hash.digest('hex');
}

function get_directory(path){
    this.directory = require('path').dirname(path) + '/',
}

function get_filename_extension(path){
    var suffix = path.split('.').pop();
    return suffix;
}

function get_includer_html(code){
    if( code.filename_extension === 'html' ) return code;
    if( code.includer ) return code.includer.includer_html; // little Software Design experiment; duplication of data to avoid up-traversal of dependency tree
    return null;
}

function get_absolute_path(code){
    assert(code.includer_html && code.includer_html.directory);
    assert(code.includer && code.includer.directory);
    assert(code.path);
    assert(code.filename_extension !== 'html' || /^\//.test(code.uri), 'uri of html code should be an absolute OS path');

    if( code.filename_extension === 'html' ) return code.uri;

    var is_relative_to_html_dir = /^\//.test(code.uri);
    var base_directory = is_relative_to_html_dir ? code.includer_html.directory : code.includer.directory;

    return require('path').join(base_directory, code.uri);
}
