### CLI Usage
```shell
npm install -g website-dependency-tree
```
the command
```shell
website-dependency-tree http://brillout.github.io/website-dependency-tree--demo/simple_demo/
```
will print
```
ok    http://brillout.github.io/website-dependency-tree--demo/simple_demo/
      ├─┬ /hello.css
      │ └── /duck.gif
      ├── /jquery.min.js
      └── /hello.js
      
```

A more complete demonstration is available [here](https://github.com/brillout/website-dependency-tree--demo)

### About

retrieves dependencies defined in
 - HTML
 - CSS
 - ES2015/JSPM
 - AMD/Require.JS

The dependencies are retrieved statically, i.e. the code is parsed and not executed.

### API Usage

```js
var website_dependency_tree = require('website-dependency-tree');

website_dependency_tree
.retrieve('path/to/index.html')
.then(function(code){
  // direct dependencies defined in index.html
  console.log(code.dependencies);
  // all transitive dependencies of index.html,
  // i.e. dependencies defined in index.html, and dependencies of the dependencies, etc.
  console.log(code.dependencies_all);
});
```

### Potential Usage

 - HTTP2 server push dependencies
 - Client-Side prefetching
 - Build process for deployment
