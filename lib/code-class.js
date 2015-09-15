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
    recursion:
        require('./workers/recursion.js'),
    dependency_retrievers: {
        html: require('./workers/retrievers/html.js'),
        css: require('./workers/retrievers/css.js'),
        jspm: require('./workers/retrievers/jspm.js'),
        requirejs: require('./workers/retrievers/requirejs.js')
    }
};


function Code(input, skip_cache){

    this.last_includer = null;
    this.root_includer = null;
    this.location = {
        uri: null,
        disk: {
            path: null,
            base: null,
            path_relative_to_base: null,
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
    this.module_loader = null;
    this.id = null;
    this.name = null;
    this.dependencies = null;
    this.dependencies_all = null;

    this._last_input = input;

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

    this.execute_pipeline = get_pipeline_executer();

    return ! skip_cache && cache.cache(this) || this;

}

Code.prototype.pipeline_workers =
    []
    .concat(
        workers.input.validate_input,
        workers.input.assign_input,

        workers.location.set_internet_location,
        workers.location.set_disk_location,
        workers.location.validate_location,

        workers.input.set_root_includer,
        workers.input.set_source_code,
        workers.input.set_id,
        workers.input.set_name,
        workers.input.deduce_mime_type,

        workers.dependency.clean,
        workers.dependency_retrievers.html,
        workers.dependency_retrievers.css,
        workers.dependency_retrievers.jspm,
        workers.dependency_retrievers.requirejs,

        workers.recursion.recurse_execution,

        workers.dependency.compute_transitive_closure, // flatten dependency tree into one array `code.dependencies_all`
        workers.dependency.prune_self_dependency // remove self dependencies
    );
