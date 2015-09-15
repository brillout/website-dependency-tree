var assert = require('better-assert');
var log = require('mini-log');


module.exports = {
    validate_input: validate_input,
    assign_input: assign_input,
    set_root_includer: set_root_includer,
    set_id: set_id,
    set_name: set_name,
    set_source_code: set_source_code,
    deduce_mime_type: deduce_mime_type
};


function assign_input(code){

    var last_inclusion = code._last_input.last_inclusion;
    last_inclusion.uri = last_inclusion.uri || null;
    last_inclusion.module_loader = last_inclusion.module_loader || null;
    last_inclusion.includer = last_inclusion.includer || null;

    stack = [];
    deep_assign(code, code._last_input);

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
                target[i] = source[i] || target[i];
            }

            stack.pop();
        }
    }
}

function validate_input(code){
    var input = code._last_input;

    if( input && ( input.uri || (input.location||{}).uri ) )
        throw "uri needs to be defined on `.last_inclusion` property; `new Code({last_inclusion: {uri: '/bla.html' }})`";
    if( input && ( input.path  || (input.location||{}).path ) )
        throw "path needs to be defined on `.location.disk` property; `new Code({location: {disk: {path: '/bla.html' }}})`";

    if( ! input || ! input.last_inclusion || ! input.last_inclusion.uri && ( ! input.last_inclusion.includer || typeof(input.source_code) === 'undefined' ) )
        throw [
            "Code Consructor needs object argument with `.last_inclusion.uri` or `.last_inclusion.includer` and `.source_code`;",
            "    `new Code({last_inclusion: {uri: '/bla.html'}})`",
            "/",
            "    `new Code({last_inclusion: {includer: new Code(/*...*/)}, source_code: new Buffer('/* src code */')})",
            "instead input ===",
            JSON.stringify(input)
        ].join('\n');

    assert( ! (input.last_inclusion||{}).includer || input.last_inclusion.includer.location.disk.directory || input.last_inclusion.includer.location.internet.url );
}

function set_root_includer(code){
    code.root_includer = code.root_includer || (code.last_inclusion.includer||{}).root_includer || code.last_inclusion.includer || null;
}

function set_id(code){
    code.id =
        code.location.disk.path ||
        code.location.internet.url ||
        compute_sha256(code.source_code) ;

    return;

    function compute_sha256(text){
        var algorithm = 'sha256';
        var h = require('crypto').createHash(algorithm);
        h.update(text);
        return algorithm + ':' + h.digest('hex');
    }

}
function set_name(code){
    code.name = (function(){
        if( ! code.root_includer )
            return code.id;
        if( code.location.internet.url ) {
            if( code.location.internet.is_cross_domain )
                return code.location.internet.url;
            else
                return code.location.internet.path;
        }
        if( code.location.disk.path ) {
            return '/' + require('path').relative(require('path').dirname(code.root_includer.location.disk.path), code.location.disk.path);
        }
        return code.id;
    })();
}

function set_source_code(code){

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

