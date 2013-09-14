Jasq
====

[AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) dependency injector integrated with
[Jasmine](https://github.com/pivotal/jasmine).

Jasq simplifies testing AMD modules by overloading Jasmine's `describe` and `it` to

* maintain spec atomicity, avoiding persistent module state
* allow mocking of the tested module's dependencies per spec

Jasq is built on the assumption that any Jasmine suite will concern (and thus, test / define the
specs for) nothing more than a single module. The Jasq version of `describe` allows specifying the
tested module (by name) and ensures that it is made available to all contained specs. In turn,
specs defined with the Jasq version of `it` gain access to the tested module (through a `module`
argument) and may easily provide ad-hock mocks for any and all of its dependencies. The tested
module is reloaded per spec and uses any mocked dependencies defined.

Jasq defines `describe` and `it` as overloaded versions of Jasmine's 'native' functions which
differ in the parameters they accept. Using Jasq will _not_ shadow Jasmine's natives - they
may be invoked (bypassing Jasq functionality) by use of appropriate parameters:

```javascript
// Invoke Jasmine 'descibe'
describe("My suite", function () {
	// .. Jasmine specs ..
});

// Invoke Jasq 'describe'
describe("My suite", "tested/module/name", function () {
	// .. Jasq & Jasmine specs ..
});

// Invoke Jasmine 'it'
it("should do something", function () {
	// .. expectations ..
});

// Invoke Jasq 'it'
it("should do something", {
	store: [
		// Define stored dependencies
	],
	mock: {
		// Define mocked dependencies
	},
	expect: function (testedModule, dependencies) {
		// .. expectations ..
	})
};
```

Jasq is built on [RequireJS](https://github.com/jrburke/requirejs) and
[Squire.js](https://github.com/iammerrick/Squire.js). At this point it has only been tested in the
browser (i.e. no Node support). This may all change.


Jasq by example
---------------

Consider modules `modA`, `modB` where the latter is a dependency of the former:

```javascript
// Defined in ModB.js:
define(function () {
	return {
		getValue: function () {
			return "B";
		}
	};
});

// Defined in modA.js:
define(["modB"], function (modB) {
	return {
		getValue: function () {
			return "A";
		},
		getModBValue: function () {
			return modB.getValue();
		}
	};
});
```

A test suite for `modA` should be defined as a module hosting the relevant specs. It should require
Jasq (but not the tested `modA` itself):

```javascript
define(["jasq"], function () {
	// Implement modA test suite
});
```

Define the test suite by invoking the Jasq-`describe`. This accepts the module name as an
additional parameter:

```javascript
require(["jasq"], function () {
	// The name of the tested module - 'modA' - is passed as a 2nd parameter
	//  to the describe call
	describe("The modA module", "modA", function () {
		// Implement modA specs
	});
});
```

This will make `modA` available to all specs within the suite. To access it, use the Jasq-`it`,
which accepts a `specConfig` hash (instead of the expectation function) as a second argument.
The `specConfig` should expose the expectation function through the `expect` attribute:

```javascript
require(["jasq"], function () {
	describe("The modA module", "modA", function () {

		// The module is passed to specs within the suite, as a parameter
		it("should have a value of 'A'", {
			expect: function (modA) {
				expect(modA.getValue()).toBe("A"); // Passes
			}
		}
	});
});
```

Note that the module will also be available to specs of nested suites:

```javascript
require(["jasq"], function () {
	describe("The modA module", "modA", function () {

		describe("its value", function () {

			// The module is also passed to specs within the nested suite
			it("should be 'A'", {
				expect: function (modA) {
					expect(modA.getValue()).toBe("A"); // Passes
				}
			}
		});
	});
});
```

Additionally, Jasq ensures that module state will not be persisted across specs:

```javascript
require(["jasq"], function () {
	describe("The modA module", "modA", function () {

		// This spec modifies modA
		it("should have a value of 'C' when tweaked", {
			expect: function (modA) {
				modA.getValue = function () {
					return "C";
				};
				expect(modA.getValue()).toBe("C"); // Passes
			}
		});

		// This spec is passed the original, unmodified modA
		it("should have a value of A", {
			expect: function (modA) {
				expect(modA.getValue()).toBe("A"); // Passes
			}
		});
	});
});
```

To mock `modA`'s dependencies use the `specConfig.mock` property. This should be a hash of
dependencies (module names) mapped to mocks. In the following example, `modB` is mapped to `mockB`:

```javascript
require(["jasq"], function () {
	describe("The modA module", "modA", function () {

		// Define a mock for modB
		var mockB = {
			getValue: function () {
				return "C";
			}
		};

		// modA will use the mocked version of modB
		it("should expose modB's value", {
			mock: {
				modB: mockB
			},
			expect: function (modA) {
				expect(modA.getModBValue()).toBe("C"); // Passes
			}
		});
	});
});
```

Specs additionally receive a `dependencies` argument which may be used to directly access mocked
dependencies:

```javascript
require(["jasq"], function () {
	describe("The modA module", "modA", function () {

		// Define a mock for modB
		var mockB = {
			getValue: function () {
				return "C";
			}
		};

		// Mocked modB may be accessed through 'dependencies.mocks.modB'
		it("should expose modB's value", {
			mock: {
				modB: {} // Mocking with an empty object
			},
			expect: function (modA, dependencies) {
				dependencies.mocks.modB.getValue = function () {
					return "D";
				};
				expect(modA.getModBValue()).toBe("D"); // Passes
			}
		});
	});
});
```

In certain cases it may be useful to access a dependency without necessarily creating a mock
beforehand. The `specConfig.store` attribute - an array of module names - may be used to list any
such dependencies. These will then be available throught `dependencies.store`:

```javascript
require(["jasq"], function () {
	describe("The modA module", "modA", function () {

		// Stored modB may be accessed through 'dependencies.store.modB'
		it("should delegate to modB to expose modB's value", {
			store: [
				"modB"
			],
			expect: function (modA, dependencies) {
				spyOn(dependencies.store.modB, "getValue");
				modA.getModBValue();
				expect(dependencies.store.modB.getValue).toHaveBeenCalled(); // Passes
			}
		});
	});
});
```

Set up
------

_..._


Reference
---------

_..._


License
-------

Licensed and freely distributed under the MIT License (LICENSE.txt).

Copyright (c) 2013 Alex Lambiris
