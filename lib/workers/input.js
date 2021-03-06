var assert = require('better-assert');
var log = require('mini-log');


module.exports = {
    validate_input: validate_input,
    assign_input: assign_input,
    set_root_depender: set_root_depender,
    set_id: set_id,
    set_name: set_name,
    set_source_code: set_source_code,
    deduce_mime_type: deduce_mime_type
};


function assign_input(code){

    var last_dependency = code._last_input.last_dependency;
    last_dependency.uri = last_dependency.uri || null;
    last_dependency.depender = last_dependency.depender || null;

    stack = [];
    deep_assign(code, code._last_input);

    var stack;
    function deep_assign(target, source){
        if( stack.length > 10 )
            throw "looks like an infinte loop; input."+stack.join('.')+" -- don't use a cyclic object as input!";

        for(var i in source) {
            stack.push(i);

            if( target[i] === undefined ) {
                throw "unexpected input."+stack.join('.')+" -- input should correspond to CodeInfo class properties";
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
        throw "uri needs to be defined on `.last_dependency` property; `new CodeInfo({last_dependency: {uri: '/bla.html' }})`";
    if( input && ( input.path  || (input.location||{}).path ) )
        throw "path needs to be defined on `.location.disk` property; `new CodeInfo({location: {disk: {path: '/bla.html' }}})`";

    if( ! input || ! input.last_dependency || ! input.last_dependency.uri && ( ! input.last_dependency.depender || typeof(input.source_code) === 'undefined' ) )
        throw [
            "CodeInfo Consructor needs object argument with `.last_dependency.uri` or `.last_dependency.depender` and `.source_code`;",
            "    `new CodeInfo({last_dependency: {uri: '/bla.html'}})`",
            "/",
            "    `new CodeInfo({last_dependency: {depender: new CodeInfo(/*...*/)}, source_code: new Buffer('/* src code */')})",
            "instead input ===",
            JSON.stringify(input)
        ].join('\n');

    assert( ! (input.last_dependency||{}).depender || input.last_dependency.depender.location.disk.directory || input.last_dependency.depender.location.internet.url );
}

function set_root_depender(code){
    code.root_depender = code.root_depender || (code.last_dependency.depender||{}).root_depender || code.last_dependency.depender || null;
    assert( !! code.root_depender === !! code.last_dependency.depender );

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
        if( ! code.root_depender )
            return code.id;
        if( code.location.internet.url ) {
            if( code.location.internet.is_cross_domain )
                return code.location.internet.url;
            else
                return code.location.internet.path;
        }
        if( code.location.disk.path ) {
            return '/' + require('path').relative(require('path').dirname(code.root_depender.location.disk.path), code.location.disk.path);
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
                log.warn("can't read `"+location.disk.path+"` but it has been found to be a dependee");
                return null;
            }
        }
        if( location.internet.url ) {
            var url = location.internet.url.replace(/^\/\//, 'http://');
            log.verbose.calc("fetch `"+url+"`");
            try{
                // Asynchronous HTTP requests would mean to have Asynchronous CodeInfo Constructor.
                // Because constructor cache depends on id which depends on source code.
                // Solution to make these HTTP requests async; assert that when constructing CodeInfo object either source_code or uri is defined.
                var body =
                    require('sync-request')('GET', url, {timeout: 5000})
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

