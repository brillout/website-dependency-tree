// infer location of source code which is either
// - path on OS, or
// - URL on internet

var assert = require('better-assert');


module.exports = {
    set_disk_location:
        set_disk_location ,
    set_internet_location:
        set_internet_location ,
    validate_location:
        validate_location
};


function set_disk_location(code){
    if( ! code.location.uri ) {
        code.location.disk.directory = code.includer.location.disk.directory;
    }
    else if ( ! is_url( code.location.uri, code.includer ) ) {
        code.location.disk.path =
            code.location.disk.path
            || get_path(code.location.uri, code.includer) ;

        code.location.disk.directory =
            require('path').dirname(code.location.disk.path) ;

        code.location.disk.base =
            get_base(code.location.disk.directory, code.includer) ;

        code.location.disk.path_relative_to_base =
            get_relative(code.location.disk.base, code.location.disk.path) ;
    }
}

function set_internet_location(code){
    if( code.location.uri && is_url( code.location.uri, code.includer ) ) {
        code.location.internet.url = get_url(code.location.uri, code.includer) ;
        code.location.internet.path = parse_url(code.location.internet.url).path ;
        code.location.internet.is_cross_domain = code.includer && parse_url(code.includer.location.internet.url).host === parse_url(code.location.internet.url).host || null;
    }
}



function validate_location(code){

    validate(code.location, code.includer);
    return;

    function validate(location, includer) {
        // addresses are absolute
        assert( location.disk.path === null || require('path').parse(location.disk.path).root );
        assert( location.internet.url === null || parse_url(location.internet.url).host );

        // directory should always exist
        assert( location.disk.path === null || location.disk.directory );

        // inline code are CSS/JS code snippets in .html files
        // there is no situation where an inline code contains inline code
        // inline code <~> location.disk.path === null && location.internet.url === null
        assert( location.disk.path !== null || location.internet.url !== null || includer && includer.location.disk.path !== null || includer && includer.location.internet.url !== null );
    }
}




function is_url(uri, includer){
    assert(uri);

    if( includer && includer.location.internet.url )
        return true;

    if( parse_url(uri).host )
        return true;

    return false;
}

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

        // URI relates to includer's path or the path of "entry point code"

        var related_includer =
            !! uri__as_path.root ?
                get_root_includer(includer) :
                includer ;

        assert( related_includer && related_includer.location.disk.directory );

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

function parse_url(url){
    // handles protocol relative URLs
    // see https://github.com/joyent/node/issues/9123
    if( ! url ) return {};
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


