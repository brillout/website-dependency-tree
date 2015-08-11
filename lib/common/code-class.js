var assert = require('better-assert');

module.exports = function Code(input){
    assert(input.path || input.source_code);

    this.path = input.path || null;

    this.directory = get_directory(this.path);

    this.filename_extension = get_filename_extension(this.path);

    this.source_code = read_file(this.path) || input.source_code;

    this.hash = compute_sha1(this.source_code);

    this.includer = input.includer;

    this.html_code = get_html_code(this);

    this.absolute_path = get_absolute_path(this);

    assert(this.directory);
    assert(this.filename_extension, "file "+this.path+" is missing a filename extension");
    assert(this.source_code);
    assert(this.hash);
    assert(this.html_code);
    assert(this.includer);
    assert(this.absolute_path);
};

function read_file(path){
    var fs = require('fs');
    return path && fs.readFileSync(path).toString();
}

function compute_sha1(text){
    var crypto = require('crypto');
    var hash = crypto.createHash('md5');
    hash.update(data);
    var digest = hash.digest('hex');
}

function get_directory(path){
    this.directory = require('path').dirname(path) + '/',
}

function does_path_point_to_file(path){
    if( ! require('../common/file-exists')(path) ) {
        console.log("WARNING; there is a dependency to "+path+" but this doens't point to a file");
        callback(null);
        return;
    }
}

function get_filename_extension(path){
    var suffix = path.split('.').pop();
    return suffix;
}

function get_html_code(code){
    if( code.filename_extension === 'html' ) return code;
    if( code.html_code ) return code.html_code;
    if( code.includer ) return code.includer.html_code; // little Software Design experiment; duplication of data to avoid up-traversal of dependency tree
    return null;
}

function get_absolute_path(code){
    assert(code.html_code.directory);
    assert(code.path);

    if( /^http/.test(code.path) ) return code.path;

    var is_relative_to_html_dir = /^\//.test(code.path);
    var base_directory = is_relative_to_html_dir ? code.html_code.directory : code.includer.directory;

    return require('path').join(base_directory, dependency_path);
}
