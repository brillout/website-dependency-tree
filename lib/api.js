var Code = require('./code-class.js');
require('./add-pipeline-workers.js');

if( typeof Promise === 'undefined' ) {
    var Promise = require('bluebird'); Promise.longStackTraces();
}

module.exports = {

    retrieve: function(uri, callback){

        var code = new Code({uri: uri});

        return new Promise(function(resolve){
            code.execute_pipeline(function(){
                if(callback && callback.constructor === Function) callback(code);
                resolve(code);
            });
        });

    },

    pipeline_workers: Code.prototype.pipeline_workers

};
