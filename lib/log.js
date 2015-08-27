var chalk = require('chalk');

var mods = [
    ['err', 'red'],
    ['warn', 'yellow'],
    ['ok', 'green'],
    ['calc', 'grey'],
    ['debug', 'bgYellow']
];

var log = mods_to_fcts();
log.verbose = mods_to_fcts(true);
module.exports = log;


function mods_to_fcts(is_verbose){
    var ret = {};
    mods.forEach(function(mod){
        ret[mod[0]] = function(msg){
            print(mod[0], mod[1], msg, is_verbose);
        };
    });
    return ret;
}

function print(prefix, prefix_color, msg, is_verbose){
    if( ! log.enable_verbose && is_verbose ) {
        return;
    }

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
        .replace(/`([^`]+)`/g, chalk.magenta('$1'));

    console.log(msg_decorated);

    if( prefix === 'err' ) {
        throw new Error(msg);
    }

    function fill_margin(text){
        while(text.length<MARGIN_SIZE){ text+=' ' }
        return text;
    }
}
