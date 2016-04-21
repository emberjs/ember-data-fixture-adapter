import DS from 'ember-data';
import FixtureAdapter from 'ember-data-fixture-adapter';
import QUnit from 'qunit';
import {module, test} from 'qunit';
import Ember from 'ember';
import {setupStore} from 'dummy/tests/test-helper';

var store, env;

var Person = DS.Model.extend({
  name: DS.attr('string'),
  cars: DS.hasMany('car')
});

var run = Ember.run;

Person.toString = function() { return "Person"; };

var Car = DS.Model.extend({
  make: DS.attr('string'),
  model: DS.attr('string'),
  person: DS.belongsTo('person')
});

Car.toString = function() { return "Car"; };

function initializeStore(name, factory) {
  env = setupStore({
    adapter: { name: name, factory: factory }
  });
  store = env.store;

  env.container.register('model:car', Car);
  env.container.register('model:person', Person);
}

module("integration/store - destroy", {
  setup: function() {
    initializeStore('fixture', FixtureAdapter.extend());
  }
});

function tap(obj, methodName, callback) {
  var old = obj[methodName];

  var summary = { called: [] };

  obj[methodName] = function() {
    var result = old.apply(obj, arguments);
    if (callback) {
      callback.apply(obj, arguments);
    }
    summary.called.push(arguments);
    return result;
  };

  return summary;
}

test("destroying record during find doesn't cause error", function(assert) {
  assert.expect(0);

  var TestAdapter = FixtureAdapter.extend({
    findRecord: function() {
      return new Ember.RSVP.Promise(function(resolve, reject) {
        Ember.run.next(function() {
          store.unloadAll(type);
          reject();
        });
      });
    }
  });

  var done = assert.async();

  initializeStore('test', TestAdapter);

  var type = "car";
  var id = 1;

  run(function() {
    store.findRecord(type, id).then(done, done);
  });
});

test("find calls do not resolve when the store is destroyed", function(assert) {
  assert.expect(0);

  var TestAdapter = FixtureAdapter.extend({
    findRecord: function() {
      store.destroy();
      Ember.RSVP.resolve(null);
    }
  });

  initializeStore('test', TestAdapter);


  var type = "car";
  var id = 1;

  store.push = function() {
    Ember.assert("The test should have destroyed the store by now", store.get("isDestroyed"));

    throw new Error("We shouldn't be pushing data into the store when it is destroyed");
  };

  run(function() {
    store.findRecord(type, id);
  });

  var done = assert.async();
  setTimeout(function() {
    done();
  }, 500);
});

