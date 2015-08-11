module.exports = function(paths){
    return paths.map(path_to_object);
};

function path_to_object(path){
    return {
        path: path
    };
}
