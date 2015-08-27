### Usage

```
npm install -g website-dependency-tree
website-dependency-tree http://brillout.github.io/website-dependency-tree--demo/simple_demo/
```

A more complete demonstration is available [here](https://github.com/brillout/website-dependency-tree--demo)


### About

retrieves dependencies defined in
 - HTML
 - CSS
 - ES2015/JSPM
 - AMD/Require.JS

The dependencies are retrieved statically, i.e. the code is parsed and not executed.


### Potential Usage

 - HTTP2 server push dependencies
 - Client-Side prefetching
 - Build process for deployment
