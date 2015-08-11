var Walker = require('node-source-walk');

module.exports = function(html_dir, html_path, callback) {

    var source_code = require('fs').readFileSync(path).toString();

    var walker = new Walker();

    html_path = 'src/';

    walker.walk(source_code, function(node){
        conosle.log(node);
    });
}
