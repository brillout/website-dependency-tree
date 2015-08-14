var Code = require('./code-class.js');
require('./add-pipeline-workers.js');

module.exports = {

    retrieve: function(uri, callback){
        var code = new Code({uri: uri});

        code.execute_pipeline(function(){
            callback(code);
        });
    },

    pipeline_workers: Code.prototype.pipeline_workers

};
