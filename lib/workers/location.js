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
    assert( !! code.root_depender === !! code.last_dependency.depender ); // root_depender is required

    if( ! code.last_dependency.uri ) {
        code.location.disk.directory = code.last_dependency.depender.location.disk.directory;
    }
    else if ( ! is_url( code.last_dependency.uri, code.last_dependency.depender ) ) {
        code.location.disk.path =
            code.location.disk.path
            || get_path(code.last_dependency.uri, code.last_dependency.depender, code.root_depender) ;

        code.location.disk.directory =
            require('path').dirname(code.location.disk.path) ;
    }
}

function set_internet_location(code){
    if( code.last_dependency.uri && is_url( code.last_dependency.uri, code.last_dependency.depender ) ) {
        code.location.internet.url = get_url(code.last_dependency.uri, code.last_dependency.depender) ;
        code.location.internet.path = parse_url(code.location.internet.url).path ;
        code.location.internet.is_cross_domain = code.last_dependency.depender && parse_url(code.last_dependency.depender.location.internet.url).host !== parse_url(code.location.internet.url).host || null;
    }
}

function validate_location(code){

    validate(code.location, code.last_dependency.depender);
    return;

    function validate(location, depender) {
        // addresses are absolute
        assert( location.disk.path === null || require('path').parse(location.disk.path).root );
        assert( location.internet.url === null || parse_url(location.internet.url).host );

        // directory should always exist
        assert( location.disk.path === null || location.disk.directory );

        // inline code are CSS/JS code snippets in .html files
        // there is no situation where an inline code contains inline code
        // inline code <~> location.disk.path === null && location.internet.url === null
        assert( location.disk.path !== null || location.internet.url !== null || depender && depender.location.disk.path !== null || depender && depender.location.internet.url !== null );
    }
}


function is_url(uri, depender){
    assert(uri);

    if( depender && depender.location.internet.url )
        return true;

    if( /^\/\//.test(uri) || /^http/.test(uri) )
        return true;

    return false;
}

function get_url(uri, depender){
    var uri__as_url = parse_url(uri);

    assert( uri__as_url.host || depender );

    if( uri__as_url.host ) {
        return uri__as_url.href;
    }

    if( depender ) {
        assert( depender.location.internet.url );
        return require('url').resolve(
            depender.location.internet.url,
            uri);
    }

    assert( false );

    return null;
}

function get_path(uri, depender, root_depender){

    var uri__as_path = require('path').parse(uri);

    if( ! depender ) {

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

        // URI relates to depender's path or the path of "entry point code"

        var related_depender =
            !! uri__as_path.root ?
                root_depender :
                depender ;

        assert( related_depender && related_depender.location.disk.directory );

        return require('path').join(
                   related_depender.location.disk.directory ,
                   uri );

    }

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
