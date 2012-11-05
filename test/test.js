/*global module, test, equal, ok, strictEqual, notStrictEqual, deepEqual, Backbone, backboneFauxServer:true */
(function () {
	"use strict";


	//
	module("Basics", {
		setup: function () {
			// Nada
		},
		teardown: function () {
			// Nada
		}
	});

	test("BFS is exposed as the backboneFauxServer global", function () {
		ok(backboneFauxServer);
	});

	test("noConflict removes BFS from global scope and returns it", function () {
		var bfs = backboneFauxServer,
			noConflictBfs = backboneFauxServer.noConflict(),
			previousBfs = backboneFauxServer;

		strictEqual(bfs, noConflictBfs, "BFS is returned");
		notStrictEqual(bfs, previousBfs, "BFS is removed from global scope");

		// Reinstate BFS in global scope (or other tests will fail)
		backboneFauxServer = noConflictBfs;
	});

	test("Routes are added and removed", function () {
		var h = function () {};

		backboneFauxServer.addRoute("testRoute1", "", "", h);
		backboneFauxServer.addRoutes({
			"testRoute2": { urlExp: "", httpMethod: "", handler: h },
			"testRoute3": { urlExp: "", httpMethod: "PUT", handler: h }
		});

		ok(backboneFauxServer.getRoute("testRoute1"), "addRoute adds route");
		ok(backboneFauxServer.getRoute("testRoute2"), "addRoutes adds routes");
		ok(backboneFauxServer.getRoute("testRoute3"), "addRoutes adds routes");

		backboneFauxServer.addRoute("testRoute3", "override", "POST", h);
		strictEqual(backboneFauxServer.getRoute("testRoute3").httpMethod, "POST", "Adding route of same name overrides previous");

		backboneFauxServer.removeRoute("testRoute2");
		ok(!backboneFauxServer.getRoute("testRoute2"), "removeRoute removes route");

		backboneFauxServer.removeRoutes();

		ok(!backboneFauxServer.getRoute("testRoute1"), "removeRoutes removes routes");
		ok(!backboneFauxServer.getRoute("testRoute3"), "removeRoutes removes routes");
	});


	//
	module("Sync", {
		setup: function () {
			var Book = Backbone.Model.extend({
					defaults: {
						title: "Unknown title",
						author: "Unknown author"
					}
				}),
				Books = Backbone.Collection.extend({
					model: Book,
					url: "library-app/books"
				}),
				createDummyBook = function (id) {
					var dummyBook = new Book({
							title: "The Catcher in the Rye",
							author: "J. D. Salinger",
							pubDate: "July 16, 1951"
						});
					if (id) { dummyBook.set({ id: id }); }
					return dummyBook;
				};

			this.Book = Book;
			this.Books = Books;
			this.createDummyBook = createDummyBook;
		},
		teardown: function () {
			delete this.Book;
			delete this.Books;
			backboneFauxServer.removeRoutes();
			Backbone.emulateHTTP = false;
		}
	});

	test("POST-handler functions as expected when saving a new Model", 7, function () {
		var book = this.createDummyBook();
		book.urlRoot = "library-app/books";

		backboneFauxServer.addRoute("createBook", "library-app/books", "POST", function (context) {
			ok(true, "POST-handler is called");
			ok(context, "_context_ is passed to POST-handler");
			deepEqual(context.data, book.toJSON(), "_context.data_ is set and reflects Model attributes");
			strictEqual(context.httpMethod, "POST", "_context.httpMethod_ is set to 'POST'");
			strictEqual(context.httpMethodOverride, undefined, "_context.httpMethodOverride_ is not set");

			return { id: "0123456789", creationTime: "now" };
		});

		book.save(); // Create

		strictEqual(book.id, "0123456789", "id returned by POST-handler is set on Model");
		strictEqual(book.get("creationTime"), "now", "Attributes returned by POST-handler are set on Model");
	});

	test("GET-handler functions as expected when fetching a Model", 6, function () {
		var book = new this.Book({
				id: "0123456789"
			}),
			retBookAttrs = this.createDummyBook("0123456789").toJSON();

		book.urlRoot = "library-app/books";

		// We've created a book of id 0123456789 and we'll be fetching it. The retBookAttrs hash
		//  holds the supposed attributes of the book so we'll be returning these from the GET-handler
		
		backboneFauxServer.addRoute("readBook", "library-app/books/:id", "GET", function (context, bookId) {
			ok(true, "GET-handler is called");
			ok(context, "_context_ is passed to GET-handler");
			strictEqual(context.httpMethod, "GET", "_context.httpMethod_ is set to 'GET'");
			strictEqual(context.httpMethodOverride, undefined, "_context.httpMethodOverride_ is not set");
			strictEqual(bookId, "0123456789", "_bookId_ is passed to GET-handler and set to id of book being fetched");

			return retBookAttrs;
		});

		book.fetch(); // Read

		deepEqual(book.toJSON(), retBookAttrs, "Attributes returned by GET-handler are set on Model");
	});

	test("GET-handler functions as expected when fetching a Collection", 5, function () {
		var books = new this.Books(),
			retBooksAttrs = [this.createDummyBook("one").toJSON(), this.createDummyBook("two").toJSON()];

		// We've created an empty Collection (of url 'library-app/books') and we'll be fetching it.
		//  The retBooksAttrs is an array of attributes hashes for the supposed models in the collection
		//  so we'll be returning that from the GET-handler
		
		backboneFauxServer.addRoute("readBooks", "library-app/books", "GET", function (context) {
			ok(true, "GET-handler is called");
			ok(context, "_context_ is passed to GET-handler");
			strictEqual(context.httpMethod, "GET", "_context.httpMethod_ is set to 'GET'");
			strictEqual(context.httpMethodOverride, undefined, "_context.httpMethodOverride_ is not set");

			return retBooksAttrs;
		});

		books.fetch(); // Read

		deepEqual(books.toJSON(), retBooksAttrs, "Model attributes returned by GET-handler are set on Collection Models");
	});

	test("PUT-handler functions as expected when saving a Model which is not new (has an id)", 7, function () {
		var book = this.createDummyBook("0123456789");
		book.urlRoot = "library-app/books";

		backboneFauxServer.addRoute("updateBook", "library-app/books/:id", "PUT", function (context, bookId) {
			ok(true, "PUT-handler is called");
			ok(context, "_context_ is passed to PUT-handler");
			deepEqual(context.data, book.toJSON(), "_context.data_ is set and reflects Model attributes");
			strictEqual(context.httpMethod, "PUT", "_context.httpMethod_ is set to 'PUT'");
			strictEqual(context.httpMethodOverride, undefined, "_context.httpMethodOverride_ is not set");
			strictEqual(bookId, "0123456789", "_bookId_ is passed to PUT-handler and set to id of book being updated");

			return { modificationTime: "now" };
		});

		book.save(); // Update

		strictEqual(book.get("modificationTime"), "now", "Attributes returned by PUT-handler are set on Model");
	});

	test("DELETE-handler functions as expected when destroying a Model", 5, function () {
		var book = this.createDummyBook("0123456789");
		book.urlRoot = "library-app/books";
		
		backboneFauxServer.addRoute("deleteBook", "library-app/books/:id", "DELETE", function (context, bookId) {
			ok(true, "DELETE-handler is called");
			ok(context, "_context_ is passed to DELETE-handler");
			strictEqual(context.httpMethod, "DELETE", "_context.httpMethod_ is set to 'DELETE'");
			strictEqual(context.httpMethodOverride, undefined, "_context.httpMethodOverride_ is not set");
			strictEqual(bookId, "0123456789", "_bookId_ is passed to DELETE-handler and set to id of book being deleted");
		});

		book.destroy(); // Delete
	});

	test("A POST-handler is called when creating Model and Backbone.emulateHTTP is true", 4, function () {
		Backbone.emulateHTTP = true;

		var book = this.createDummyBook();
		book.urlRoot = "library-app/books";

		backboneFauxServer.addRoute("createBook", "library-app/books", "POST", function (context) {
			ok(true, "POST-handler is called");
			ok(context, "_context_ is passed to POST-handler");
			strictEqual(context.httpMethod, "POST", "_context.httpMethod_ is set to 'POST'");
			strictEqual(context.httpMethodOverride, "POST", "_context.httpMethodOverride_ is set to 'POST'");
		});

		book.save(); // Create
	});

	test("A POST-handler (instead of PUT) is called when updating Model and Backbone.emulateHTTP is true", 4, function () {
		Backbone.emulateHTTP = true;

		var book = this.createDummyBook("0123456789");
		book.urlRoot = "library-app/books";

		backboneFauxServer.addRoute("updateBook", "library-app/books/:id", "POST", function (context) {
			ok(true, "POST-handler is called");
			ok(context, "_context_ is passed to POST-handler");
			strictEqual(context.httpMethod, "POST", "_context.httpMethod_ is set to 'POST'");
			strictEqual(context.httpMethodOverride, "PUT", "_context.httpMethodOverride_ is set to 'PUT'");
		});

		book.save(); // Update
	});

	test("A POST-handler (instead of DELETE) is called when destroying Model and Backbone.emulateHTTP is true", 4, function () {
		Backbone.emulateHTTP = true;

		var book = this.createDummyBook("0123456789");
		book.urlRoot = "library-app/books";
		
		backboneFauxServer.addRoute("deleteBook", "library-app/books/:id", "POST", function (context) {
			ok(true, "POST-handler is called");
			ok(context, "_context_ is passed to POST-handler");
			strictEqual(context.httpMethod, "POST", "_context.httpMethod_ is set to 'POST'");
			strictEqual(context.httpMethodOverride, "DELETE", "_context.httpMethodOverride_ is set to 'DELETE'");
		});

		book.destroy(); // Delete
	});

	test("Returning a string from any handler is treated as an error", 5, function () {
		backboneFauxServer.addRoutes({
			createBook: {
				urlExp: "library-app/books",
				httpMethod: "POST",
				handler: function () { return "Some error occured"; }
			},
			readBook: {
				urlExp: "library-app/books/:id",
				httpMethod: "GET",
				handler: function () { return "Some error occured"; }
			},
			readBooks: {
				urlExp: "library-app/books",
				httpMethod: "GET",
				handler: function () { return "Some error occured"; }
			},
			updateBook: {
				urlExp: "library-app/books/:id",
				httpMethod: "PUT",
				handler: function () { return "Some error occured"; }
			},
			deleteBook: {
				urlExp: "library-app/books/:id",
				httpMethod: "DELETE",
				handler: function () { return "Some error occured"; }
			}
		});

		var book = this.createDummyBook(),
			books = new this.Books();
		book.urlRoot = "library-app/books";

		book.save(null, { // Create
			error: function () { ok(true, "True when saving a new Model (a POST-handler)"); }
		});

		book.set({ id: "0123456789" });

		book.fetch({ // Read Model
			error: function () { ok(true, "True when fetching a Model (a GET-handler)"); }
		});

		books.fetch({ // Read Collection
			error: function () { ok(true, "True when fetching a Collection (a GET-handler)"); }
		});

		book.save(null, { // Update
			error: function () { ok(true, "True when updating a Model (a PUT-handler)"); }
		});

		book.destroy({ // Delete
			error: function () { ok(true, "True when destroying a Model (a DELETE-handler)"); }
		});
	});

}());

