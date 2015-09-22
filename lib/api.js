if( typeof Promise === 'undefined' ) {
    var Promise = require('bluebird'); Promise.longStackTraces(); }
require('core-js/fn/object/assign');
var log = require('mini-log');
log.options.throw_on_error = true;
var CodeInfo = require('./code-class.js');


module.exports = {
    retrieve: retrieve,
    pipeline_workers: CodeInfo.prototype.pipeline_workers,
    CodeInfo: CodeInfo
};

function retrieve(args){
    if( args && args.constructor===String ) {
        args = {
            uri: arguments[0],
            callback: arguments[1]
        };
    }

    if( ! args || ! args.uri ) {
        log.err(
            "`uri` argument is required; `" +
            require('../package.json').name +
            "." + 'retrieve' +
            "({uri:'path/to/entry/index.html'})`");
    }

    if( args.verbose ) {
        log.options.verbose = true;
    }

    var code = new CodeInfo({
        last_inclusion: {
            uri: args.uri
        }
    });

    return (
        code
        .retrieve_dependencies()
        .then(function(){
            if( args.callback ) {
                // stop Promise to catch errors
                setTimeout(function(){
                    args.callback(code);
                },0);
            }
            return code;
        })
    );
}
