# Ember Data Fixture Adapter

[![Build Status](https://travis-ci.org/emberjs/ember-data-fixture-adapter.svg)](https://travis-ci.org/emberjs/ember-data-fixture-adapter)

This addon contains the FixtureAdapter from Ember Data. The
FixtureAdapter lets you find, store, modify, and delete records using an
in-memory store.

The FixtureAdapter was removed from Ember Data core in May 2015 due to
the lack of an interested maintainer and overall bugginess. We recommend
you switch to using an AJAX stubbing library like
[Pretender](https://github.com/trek/pretender).

**This addon is currently not maintained by the Ember Data team.**
However, we will be happy to merge documentation fixes.

## Installation

You can use it as an addon using `ember install ember-data-fixture-adapter`.

If you are using it in globals mode, you can use [Ember
Giftwrap](https://github.com/ef4/ember-giftwrap) to build it for your
application.

## Usage

You can define a `FIXTURES` array on your model with some data you would
like available by default:

```javascript
import DS from 'ember-data';

var Post = DS.Model.extend({
  title: DS.attr()
});

Post.reopenClass({
  FIXTURES: [
    {
      id: 1,
      title: "Something something Basecamp"
    }
  ]
});

export default Post;
```

Then, in your tests, set your app's application adapter to the
FixtureAdapter:

```javascript
// app/adapters/application.js
export { default } from 'ember-data-fixture-adapter';
```

## Development Installation

* `git clone` this repository
* `npm install`
* `bower install`

## Running

* `ember server`
* Visit your app at http://localhost:4200.

## Running Tests

* `ember test`
* `ember test --server`

## Building

* `ember build`

For more information on using ember-cli, visit [http://www.ember-cli.com/](http://www.ember-cli.com/).
