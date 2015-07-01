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
    find: function() {
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
    store.find(type, id).then(done, done);
  });
});

test("find calls do not resolve when the store is destroyed", function(assert) {
  assert.expect(0);

  var TestAdapter = FixtureAdapter.extend({
    find: function() {
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
    store.find(type, id);
  });

  var done = assert.async();
  setTimeout(function() {
    done();
  }, 500);
});


test("destroying the store correctly cleans everything up", function(assert) {
  var car, person;
  run(function() {
    car = store.push('car', {
      id: 1,
      make: 'BMC',
      model: 'Mini',
      person: 1
    });

    person = store.push('person', {
      id: 1,
      name: 'Tom Dale',
      cars: [1]
    });
  });

  var personWillDestroy = tap(person, 'willDestroy');
  var carWillDestroy = tap(car, 'willDestroy');
  var carsWillDestroy = tap(car.get('person.cars'), 'willDestroy');

  env.adapter.findQuery = function() {
    return [{
      id: 2,
      name: 'Yehuda'
    }];
  };
  var adapterPopulatedPeople, filterdPeople;

  run(function() {
    adapterPopulatedPeople = store.find('person', {
      someCrazy: 'query'
    });
  });

  run(function() {
    filterdPeople = store.filter('person', function() { return true; });
  });

  var filterdPeopleWillDestroy =  tap(filterdPeople.content, 'willDestroy');
  var adapterPopulatedPeopleWillDestroy = tap(adapterPopulatedPeople.content, 'willDestroy');

  run(function() {
    store.find('person', 2);
  });

  assert.equal(personWillDestroy.called.length, 0, 'expected person.willDestroy to not have been called');
  assert.equal(carWillDestroy.called.length, 0, 'expected car.willDestroy to not have been called');
  assert.equal(carsWillDestroy.called.length, 0, 'expected cars.willDestroy to not have been called');
  assert.equal(adapterPopulatedPeopleWillDestroy.called.length, 0, 'expected adapterPopulatedPeople.willDestroy to not have been called');
  assert.equal(filterdPeopleWillDestroy.called.length, 0, 'expected filterdPeople.willDestroy to not have been called');

  assert.equal(filterdPeople.get('length'), 2, 'expected filterdPeople to have 2 entries');

  assert.equal(car.get('person'), person, "expected car's person to be the correct person");
  assert.equal(person.get('cars.firstObject'), car, " expected persons cars's firstRecord to be the correct car");

  Ember.run(person, person.destroy);
  Ember.run(store, 'destroy');

  assert.equal(car.get('person'), null, "expected car.person to no longer be present");

  assert.equal(personWillDestroy.called.length, 1, 'expected person to have recieved willDestroy once');
  assert.equal(carWillDestroy.called.length, 1, 'expected car to recieve willDestroy once');
  assert.equal(carsWillDestroy.called.length, 1, 'expected cars to recieve willDestroy once');
  assert.equal(adapterPopulatedPeopleWillDestroy.called.length, 1, 'expected adapterPopulatedPeople to recieve willDestroy once');
  assert.equal(filterdPeopleWillDestroy.called.length, 1, 'expected filterdPeople.willDestroy to have been called once');
});

