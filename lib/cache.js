var assert = require('better-assert');
var Code = require('./code-class.js');
var workers = {
    input:
        require('./workers/input.js'),
    location:
        require('./workers/location.js'),
};


module.exports = cache;

var cache_map = {}
function cache(code){
    var temp_code = new Code(code._last_input, true);

    workers.input.validate_input(temp_code);
    workers.input.assign_input(temp_code);

    workers.location.set_internet_location(temp_code);
    workers.location.set_disk_location(temp_code);
    workers.location.validate_location(temp_code);

    workers.input.set_id(temp_code);

    if( ! temp_code.id ) {
        workers.input.set_source_code(temp_code);
        workers.input.set_id(temp_code);
    }

    assert( temp_code.id );

    if( ! temp_code.id ) return code;
    cache_map[temp_code.id] = cache_map[temp_code.id] || code;

    cache_map[temp_code.id]._last_input.last_includer = code._last_input.last_includer;
    cache_map[temp_code.id].last_includer = code.last_includer;

    return cache_map[temp_code.id];
}

cache.get_all_entries = function(){
    var ret = [];
    for(var id in cache_map){
        ret.push(cache_map[id]);
    }
    return ret;
};
