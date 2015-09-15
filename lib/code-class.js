// Code Object Class
// - a piece of code is represented by an instance of this Code Class
// - cumulates and holds information about the piece of code inlcuding its dependencies

var assert = require('better-assert');
var log = require('mini-log');
var get_pipeline_executer = require('./pipeline-executer.js');

module.exports = Code;

var cache = require('./cache.js');
var workers = {
    input:
        require('./workers/input.js'),
    location:
        require('./workers/location.js'),
    dependency:
        require('./workers/dependency.js'),
    dependency_retrievers: {
        html: require('./workers/retrievers/html.js'),
        css: require('./workers/retrievers/css.js'),
        jspm: require('./workers/retrievers/jspm.js'),
        requirejs: require('./workers/retrievers/requirejs.js')
    }
};


function Code(input, skip_cache_and_pipeline){

    this.last_inclusion = {
        uri: null,
        module_loader: null,
        includer: null
    };
    this.root_includer = null;
    this.location = {
        disk: {
            path: null,
            directory: null
        },
        internet: {
            url: null,
            path: null,
            is_cross_domain: null
        }
    };
    this.mutation = {
        removeDependency: null,
        insertDependencyBefore: null
    };
    this.source_code = null;
    this.mime_type = null;
    this.id = null;
    this.name = null;
    this.dependencies = null;
    this.dependencies_all = null;

    var that = this;
    Object.defineProperty(this, 'includers', {get: function(){
        return (
            cache
            .get_all_cached_entries()
            .filter(function(code){
                return (code.dependencies||[]).indexOf(that) !== -1;
            })
        )
    }});

    this._execute_pipeline = get_pipeline_executer();
    this.retrieve_dependencies = function(){
        return this._execute_pipeline({start: break_});
    };

    this._last_input = input;
    if( skip_cache_and_pipeline ) {
        var code = this;
    }
    else {
        var code = cache.cache(this);
        code._last_input = input;
        code._execute_pipeline({end: break_});
    }
    return code;

}

function break_(){}

Code.prototype.pipeline_workers =
    []
    .concat(
        workers.input.validate_input,
        workers.input.assign_input,
        workers.input.set_root_includer,

        workers.location.set_internet_location,
        workers.location.set_disk_location,
        workers.location.validate_location,

        workers.input.set_source_code,
        workers.input.set_id,
        workers.input.set_name,
        workers.input.deduce_mime_type,

        break_,

        workers.dependency.clean,
        workers.dependency_retrievers.html,
        workers.dependency_retrievers.css,
        workers.dependency_retrievers.jspm,
        workers.dependency_retrievers.requirejs,

        workers.dependency.recurse,

        workers.dependency.compute_transitive_closure, // flatten dependency tree into one array `code.dependencies_all`
        workers.dependency.prune_self_dependency // remove self dependencies
    );
