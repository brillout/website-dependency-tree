var chalk = require('chalk');

module.exports = {
    err: function(msg) {
        log('err', 'red', msg) },
    warn: function(msg) {
        log('warn', 'yellow', msg) },
    ok: function(msg) {
        log('ok', 'green', msg) },
    calc: function(msg) {
        log('calc', 'grey', msg) },
    debug: function(msg) {
        log('debug', 'bgYellow', msg) }
};

function log(prefix, prefix_color, msg){
    var MARGIN_SIZE = 6;

    var left_margin = fill_margin('');

    var left_margin_text =
        chalk[prefix_color](
            fill_margin(
                prefix));

    msg_decorated =
        '\n' +
        (msg||'')
        .replace(/^/, left_margin_text)
        .replace(/\n/g, '\n' + left_margin)
        .replace(/`([^`]+)`/g, chalk.magenta('$1')) +
        '\n';

    console.log(msg_decorated);

    if( prefix === 'err' ) {
        throw new Error(msg);
    }

    function fill_margin(text){
        while(text.length<MARGIN_SIZE){ text+=' ' }
        return text;
    }
}
