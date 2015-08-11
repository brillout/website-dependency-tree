module.exports = function(path){
    try {
        require('fs').lstatSync(path);
        return true;
    }
    catch (e) {
        return false;
    }
};
