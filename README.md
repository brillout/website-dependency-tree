### CLI Usage
```shell
npm install -g website-dependency-tree
```
the command
```shell
website-dependency-tree http://brillout.github.io/demo-website/simple_demo/
```
will print
```
ok    http://brillout.github.io/demo-website/simple_demo/
      ├─┬ /hello.css
      │ └── /duck.gif
      ├── /jquery.min.js
      └── /hello.js
      
```

A more complete demonstration is available [here](https://github.com/brillout/demo-website)

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
  console.log(code.dependees);
  // all transitive dependencies of index.html,
  // i.e. dependencies defined in index.html, and dependencies of the dependencies, etc.
  console.log(code.dependees_all);
});
```

### Potential Usage

 - HTTP2 server push dependencies
 - Client-Side prefetching
 - Build process for deployment
