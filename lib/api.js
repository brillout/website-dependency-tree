if( typeof Promise === 'undefined' ) {
    var Promise = require('bluebird'); Promise.longStackTraces(); }
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
        last_dependency: {
            uri: args.uri
        }
    });

    return code.retrieve_dependencies(args.callback);
}
