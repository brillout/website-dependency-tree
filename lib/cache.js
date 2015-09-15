var assert = require('better-assert');
var Code = require('./code-class.js');
var workers = {
    input:
        require('./workers/input.js'),
    location:
        require('./workers/location.js'),
};


module.exports = {
    cache: cache,
    get_all_cached_entries: get_all_cached_entries
};

var cache_map = {};

function cache(code_pristine){

    var code_id = (function(){
        var temp_code = new Code(code_pristine._last_input, true);

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

        return temp_code.id;
    })();

    if( ! code_id ) {
        return null;
    }

    cache_map[code_id] = cache_map[code_id] || code_pristine;
    return cache_map[code_id];

}

function get_all_cached_entries(){
    var cached_codes = [];
    for(var id in cache_map){
        cached_codes.push(cache_map[id]);
    }
    return cached_codes;
}
