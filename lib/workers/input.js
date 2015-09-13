var assert = require('better-assert');
var log = require('mini-log');


module.exports = {
    validate_input: validate_input,
    assign_input: assign_input,
    set_id: set_id,
    fetch_source_code: fetch_source_code,
    deduce_mime_type: deduce_mime_type
};





function assign_input(code){

    stack = [];
    deep_assign(code, code._input);

    var stack;
    function deep_assign(target, source){
        if( stack.length > 10 )
            throw "looks like an infinte loop; input."+stack.join('.')+" -- don't use a cyclic object as input!";

        for(var i in source) {
            stack.push(i);

            if( target[i] === undefined ) {
                throw "unexpected input."+stack.join('.')+" -- input should correspond to Code class properties";
            }

            if( source[i] && source[i].constructor === Object ) {
                deep_assign(target[i], source[i]);
            }
            else {
                assert( !source[i] || source[i].constructor !== Array );
                target[i] = source[i];
            }

            stack.pop();
        }
    }
}

function validate_input(code){
    if( code._input.uri )
        throw "uri needs to be defined on location property; `new Code({location: {uri: '/bla.html' }})`";
    if( code._input.path || code._input.path)
        throw "path needs to be defined on location.disk property; `new Code({location: {disk: {path: '/bla.html' }}})`";

    assert( (code._input.location||{}).uri || typeof(code._input.source_code) !== 'undefined' && code._input.includer );

    assert( ! code._input.includer || code._input.includer.location.disk.path || code._input.includer.location.internet.url );
    assert( ! code._input.includer || !! code._input.includer.location.disk.path === !! code._input.includer.location.disk.directory );

}


function set_id(code){
    code.id =
        code.location.disk.path_relative_to_base ||
        code.location.internet[code.location.internet.is_cross_domain===false?'path':'url'] ||
        code.location.uri ||
        compute_sha256(code.source_code) ;

    return;

    function compute_sha256(text){
        var algorithm = 'sha256';
        var h = require('crypto').createHash(algorithm);
        h.update(text);
        return algorithm + ':' + h.digest('hex');
    }

}

function fetch_source_code(code){

    code.source_code = code.source_code || fetch(code.location);
    return;

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
}

function deduce_mime_type(code){

    code.mime_type = code.mime_type || get_mime_type(code.location);
    return;

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
    }

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

