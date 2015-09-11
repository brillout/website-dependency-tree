if( typeof Promise === 'undefined' ) {
    var Promise = require('bluebird'); Promise.longStackTraces(); }
require('core-js/fn/object/assign');
var log = require('mini-log');
log.options.throw_on_error = true;
var Code = require('./code-class.js');
require('./add-pipeline-workers.js');


module.exports = {

    retrieve: function(args){
        if( args && args.constructor===String ) {
            args = {
                uri: args
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

        var code = new Code({
            location: {
                uri: args.uri
            }
        });

        return new Promise(function(resolve){
            code.execute_pipeline(function(){
                if(args.callback && args.callback.constructor === Function) args.callback(code);
                resolve(code);
            });
        });

    },

    pipeline_workers: Code.prototype.pipeline_workers,

    Code: Code

};
