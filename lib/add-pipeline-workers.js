var Code = require('./code-class.js');

var retrievers = [
    require('./dependency_retrievers/html.js'),
    require('./dependency_retrievers/require.js'),
    require('./dependency_retrievers/js.js'),
    require('./dependency_retrievers/jspm.js'),
    require('./dependency_retrievers/css.js')
];

Code.prototype.pipeline =
    Code.prototype.pipeline.concat(retrievers);

