Backbone Faux Server v0.4.0
===========================

[![Build Status](https://travis-ci.org/biril/backbone-faux-server.png)](https://travis-ci.org/biril/backbone-faux-server)


A (tiny) framework for easily mocking-up a server when working with
[Backbone.js](https://github.com/documentcloud/backbone)

Define any number of routes that map `<model-URL, sync-method>` pairs to custom handlers (callbacks). Faux-server
overrides (is a drop-in replacement of) Backbone's native sync so that whenever a Model (or Collection) is synced
and its URL along with the sync method being used form a pair that matches a defined route, the route's handler is
invoked. Implement handlers in JS to test the expected behaviour of your app, work with dummy data, support
persistence using local-storage, etc. When / if you choose to move to a real server, switching back to Backbone's
native, ajax-based sync is as simple as calling `fauxServer.enable(false)`.

Backbone faux server grew out of the author's need to quickly flesh out Backbone prototype apps without having to
fiddle with a server, a DB, or anything else that would require more than a JS script. Other solutions exist for
this (such as [Backbone localStorage Adapter](https://github.com/jeromegn/Backbone.localStorage)) but they deviate
from (or at least obscure) Backbone's opinion of Model URLs, REST and their interdependence. Backbone faux server
allows you to handle POSTs, GETs, PUTs and DELETEs *per* Model (or Collection) URL as if you're working on the
server side. Any functionality written this way, may be ported to a real server in a very straightforward manner.


Set up
------

`git clone git://github.com/biril/backbone-faux-server` or `npm install backbone-faux-server` to get up and running.
Backbone faux server will be exposed as a Global, a CommonJS module or an AMD module depending on the detected
environment.

* When working in a *browser environment, without a module-framework,* include backbone.faux.server.js after backbone.js

    ```html
    ...
    <script type="text/javascript" src="backbone.js"></script>
    <script type="text/javascript" src="backbone.faux.server.js"></script>
    ...
    ```

    and faux-server will be exposed as the global `fauxServer`:

    ```javascript
    console.log("working with version " + fauxServer.getVersion());
    ```

* `require` when working *with CommonJS* (e.g. Node.js)

    ```javascript
    var fauxServer = require("./backbone.faux.server.js");
    console.log("working with version " + fauxServer.getVersion());
    ```
    
    (`npm install` Backbone & Underscore dependencies beforehand - see package.json)

* Or list as a dependency when working *with an AMD loader* (e.g. require.js)

    ```javascript
    // Your module
    define(["backbone.faux.server"], function (fauxServer) {
    	console.log("working with version " + fauxServer.getVersion());
    });
    ```

    (you'll probably be using AMD-compliant versions of [Backbone](https://github.com/amdjs/backbone) and
    [Underscore](https://github.com/amdjs/underscore))


Usage
-----

Define Backbone Models and Collections as you normally would:

```javascript
var Book = Backbone.Model.extend({
	defaults: {
		title: "Unknown title",
		author: "Unknown author"
	}
});
var Books = Backbone.Collection.extend({
	model: Book,
	url: "library-app/books"
});
```

Note that the `url` property is used, as it normally would in any scenario involving a remote server.

Continue by defining routes on the faux-server, to handle Model syncing as needed. Every route defines a mapping
from a Model(or Collection)-URL & sync-method (as defined in the context of HTTP (POST, GET, PUT, DELETE)) to some
specific handler (callback):

`<model-URL, sync-method> → handler`

For example, to handle the creation of a Book (`Books.create(..)`), define a route that maps the
`<"library-app/books", "POST">` pair to a handler, like so:

```javascript
fauxServer.addRoute("createBook", "library-app/books", "POST", function (context) {
	// Every handler receives a 'context' parameter. Use context.data (a hash of Book attributes)
	//  to create the Book entry in your persistence layer. Return attributes of created Book.
	//  Something along the lines of:
	context.data.id = newId(); // Almost certainly, you'll have to create an id
	books.push(context.data); // Save to persistence layer
	return context.data;
});
```

The "createBook" parameter simply defines a name for the route. The URL parameter, "library-app/books", is pretty
straightforward in the preceding example - it's the URL of the Books Collection. Note however that the URL may
(and usually will) be specified as a matching expression, similarly to
[Backbone routes](http://backbonejs.org/#Router-routes): URL-expressions may contain parameter parts, `:param`,
which match a single URL component between slashes; and splat parts `*splat`, which can match any number of URL
components. The values captured by params and splats will be passed as extra parameters to the given handler
method. The URL-expression may also be a regular expression, in which case all values captured by reg-exp
capturing groups will be passed as extra parameters to the handler method.

Define more routes to handle updating, reading and deleting Models. The `addRoutes` method is used below to define
routes to handle all actions (create, read, update and delete) for the preceding Book example:

```javascript
fauxServer.addRoutes({
	createBook: {
		urlExp: "library-app/books",
		httpMethod: "POST",
		handler: function (context) {
			// Create book using attributes in context.data
			// Save to persistence layer
			// Return attributes of newly created book
		}
	},
	readBooks: {
		urlExp: "library-app/books",
		httpMethod: "GET",
		handler: function (context) {
			// Return array of stored book attributes
		}
	},
	readBook: {
		urlExp: "library-app/books/:id",
		httpMethod: "GET",
		handler: function (context, bookId) {
			// Return attributes of stored book with id 'bookId'
		}
	},
	updateBook: {
		urlExp: "library-app/books/:id",
		httpMethod: "PUT",
		handler: function (context, bookId) {
			// Update stored book with id 'bookId', using attributes in context.data
			// Return updated attributes
		}
	},
	deleteBook: {
		urlExp: "library-app/books/:id",
		httpMethod: "DELETE",
		handler: function (context, bookId) {
			// Delete stored book of id 'bookId'
		}
	}
}
```


Testing
-------

The test suite may be run in a browser or on the command line. To run in a browser simply open test/index.html. The
command line version runs on Node.js and depends on [node-qunit](https://github.com/kof/node-qunit) (`npm install`
to get it, along with Backbone and Underscore). To run the tests on the command line either `make test` or
`npm test`.


Reference
---------

The following list, while not exhaustive, includes all essential parts of the faux-server API. The ommitted
bits are there to aid testing and fascilitate fancy stuff you probably won't ever need. Further insight may
be gained by taking a look at the test suit and - of course - the source.

### Methods

All methods return the faux-server unless otherwise noted.

#### addRoute (name, urlExp, httpMethod, handler)

Add a route to the faux-server. Every route defines a mapping from a Model(or Collection)-URL & sync-method (as
defined in the context of HTTP (POST, GET, PUT, DELETE)) to some specific handler (callback):

`<model-URL, sync-method> → handler`

So every time a Model is created, read, updated or deleted, its URL and the the sync method being used will be tested
against defined routes in order to find a handler for creating, reading, updating or deleting this Model. The same
applies to reading Collections. Everytime a Collection is read, its URL (and the 'read' method) will be tested against
defined routes in order to find a handler for reading this Collection. When a match for the `<model-URL, sync-method>`
pair is not found among defined routes, the native sync (or a custom handler) will be invoked (see `setOnNoRoute`).
Later routes take precedence over earlier routes so in situations where multiple routes match, the one most recently
defined will be used.

* `name`: The name of the route
* `urlExp`: An expression against which, Model(or Collection)-URLs will be tested. This is syntactically and
    functionally analogous to [Backbone routes](http://backbonejs.org/#Router-routes) so `urlExp`s may contain
    parameter parts, `:param`, which match a single URL component between slashes; and splat parts `*splat`, which can
    match any number of URL components. The values captured by params and splats will be passed as parameters to the
    given handler method. The `urlExp` can also be a raw regular expression, in which case all values captured by
    reg-exp capturing groups will be passed as parameters to the given handler method.
* `httpMethod`: The sync method, as defined in the context of HTTP (POST, GET, PUT, DELETE), that should trigger the
	route's handler (both the URL-expression and the method should match for the handler to be invoked). `httpMethod`
	may also be set to '*' to create a match-all-methods handler; one that will be invoked whenever `urlExp` matches
	the model's (or collection's) URL _regardless_ of method. Omitting the parameter or setting to falsy values has
	the same effect. In the scope of a match-all-methods handler, the HTTP method currently being handled may be
	acquired by querying the `context` parameter for `context.httpMethod`. Note that when `Backbone.emulateHTTP` is
	set to true, 'create', 'update' and 'delete' are all mapped to POST so `context.httpMethod` will be set to POST
	for all these methods. However, in this case, the true HTTP method being handled may be acquired by querying the
	handler's `context` for `context.httpMethodOverride`.
* `handler`: The handler to be invoked when both route's URL-expression and route's method match. A do-nothing handler
	will be used if one is not provided. Its signature should be
    
    `function (context, [param1, [param2, ...]])`
    
    where `context` contains properties `data`, `httpMethod`, `httpMethodOverride`, `route` and `param1`, `param2`, ...
    are parameters deduced from matching the `urlExp` to the Model (or Collection) URL. Specifically, about `context`
    properties:

    * `context.data`: Attributes of the Model (or Collection) being proccessed. Valid only on 'create' (POST) or
       'update' (PUT).
    * `context.httpMethod`: The HTTP Method (POST, GET, PUT, DELETE) that is currently being handled by the handler.
    * `context.url`: The URL that is currently being handled by the handler.
    * `context.httpMethodOverride`: The true HTTP method (POST, GET, PUT, DELETE) that is currently being handled
       when `Backbone.emulateHTTP` is set to true. The equivalent of
       [Backbone's](http://backbonejs.org/#Sync-emulateHTTP) `X-HTTP-Method-Override` header.
    * `context.route`: The route that is currently being handled by the handler.
    
    On success, the handler should return created Model attributes after handling a POST and updated Model attributes
    after handling a PUT. Return Model attributes after handling a GET or an array of Model attributes after handling
    a GET that refers to a collection. Note that only attributes that have been changed on the server (and should be
    updated on the client) need to be included in returned hashes. Return nothing after handling a DELETE. On failure,
    return any string (presumably a custom error messsage, an HTTP status code that indicates failure, etc).

#### addRoutes (routes)

Add multiple routes to the faux-server.

* `routes`: A hash or array of routes to add. When passing a hash, keys should be route names and each route (nested
	hash) need only contain `urlExp`, `httpMethod` and `handler`. Also see `addRoute`.

#### removeRoute (name)

Remove the route of given name.

* `name`: Name of route to remove.

#### removeRoutes ()

Remove all defined routes.

#### getRoute (name)

Get route of given name. 

* `name`: Name of route to acquire.
* returns: Route of given name or null if no such route exists. Note that the returned route is a copy and cannot
	be modified to alter faux-server's behaviour

#### setDefaultHandler (handler)

Set a handler to be invoked when no route is matched to the current `<model-URL, sync-method>` pair. By default the
native sync will be invoked - use this method to provide a custom handler which overrides this behaviour.

* `handler`: A handler to be invoked when no route is matched to the current `<model-URL, sync-method>`. Ommit the
	parameter to set the native sync behaviour. See `addRoute` for handler's signature and semantics. Note that a
	default-handler isn't part of a route, so the `context.route` parameter will not be valid.

#### enable (shouldEnable)

Enable or disable the faux-server. When disabled, syncing is performed by the native Backbone sync method. Handy for
easily toggling between mock / real server

* `shouldEnable`: Indicates whether to enable or disable. Set to true or ommit altogether to enable the faux-server,
	set to false to disable

#### getVersion ()

Get the faux-server version

#### noConflict ()

Run in no-conflict mode, setting the global `fauxServer` variable to to its previous value. Only useful when working
in a browser environment without a module-framework as this is the only case where `fauxServer` is exposed globally.
Returns a reference to the faux-server.


License
-------

Licensed under the MIT License (LICENSE.txt).

Copyright (c) 2012 Alex Lambiris
