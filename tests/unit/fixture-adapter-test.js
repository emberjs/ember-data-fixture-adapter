import DS from 'ember-data';
import FixtureAdapter from 'ember-data-fixture-adapter';
import {setupStore, async} from 'dummy/tests/test-helper';
import QUnit from 'qunit';
import {module, test} from 'qunit';
import Ember from 'ember';

var get = Ember.get;
var env, Person, Phone;
var run = Ember.run;

module("integration/adapter/fixture_adapter - FixtureAdapter", {
  setup: function() {
    Person = DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),

      height: DS.attr('number'),

      phones: DS.hasMany('phone', { async: true })
    });

    Phone = DS.Model.extend({
      person: DS.belongsTo('person', { async: true })
    });

    env = setupStore({
      person: Person,
      phone: Phone,
      adapter: { name: 'fixture', factory: FixtureAdapter }
    });

    env.adapter.simulateRemoteResponse = true;
    env.adapter.latency = 50;

    // Enable setTimeout.
    Ember.testing = false;

    Person.FIXTURES = [];
    Phone.FIXTURES = [];
  },
  teardown: function() {
    Ember.testing = true;

    run(env.container, 'destroy');
  }
});

test("should load data for a type asynchronously when it is requested", function(assert) {
  Person.FIXTURES = [
    {
      id: 'wycats',
      firstName: "Yehuda",
      lastName: "Katz",
      height: 65
    },
    {
      id: 'ebryn',
      firstName: "Erik",
      lastName: "Brynjolffsosysdfon",
      height: 70,
      phones: [1, 2]
    }];

    Phone.FIXTURES = [
      {
        id: 1,
        person: 'ebryn'
      },
      {
        id: 2,
        person: 'ebryn'
      }
    ];

    run(env.store, 'findRecord', 'person', 'ebryn').then(async(function(ebryn) {
      assert.equal(get(ebryn, 'isLoaded'), true, "data loads asynchronously");
      assert.equal(get(ebryn, 'height'), 70, "data from fixtures is loaded correctly");

      return Ember.RSVP.hash({ ebryn: ebryn, wycats: env.store.findRecord('person', 'wycats') });
    }, 1000)).then(async(function(records) {
      assert.equal(get(records.wycats, 'isLoaded'), true, "subsequent requests for records are returned asynchronously");
      assert.equal(get(records.wycats, 'height'), 65, "subsequent requested records contain correct information");

      return get(records.ebryn, 'phones');
    }, 1000)).then(async(function(phones) {
      assert.equal(get(phones, 'length'), 2, "relationships from fixtures is loaded correctly");
    }, 1000));
});

test("should load data asynchronously at the end of the runloop when simulateRemoteResponse is false", function(assert) {
  Person.FIXTURES = [{
    id: 'wycats',
    firstName: "Yehuda"
  }];

  env.adapter.simulateRemoteResponse = false;

  var wycats;

  Ember.run(function() {
    env.store.findRecord('person', 'wycats').then(function(person) {
      wycats = person;
    });
  });

  assert.ok(get(wycats, 'isLoaded'), 'isLoaded is true after runloop finishes');
  assert.equal(get(wycats, 'firstName'), 'Yehuda', 'record properties are defined after runloop finishes');
});

test("should create record asynchronously when it is committed", function(assert) {
  var paul;
  assert.equal(Person.FIXTURES.length, 0, "Fixtures is empty");

  run(function() {
    paul = env.store.createRecord('person', { firstName: 'Paul', lastName: 'Chavard', height: 70 });
  });

  paul.on('didCreate', async(function() {
    assert.equal(get(paul, 'isNew'), false, "data loads asynchronously");
    assert.equal(get(paul, 'hasDirtyAttributes'), false, "data loads asynchronously");
    assert.equal(get(paul, 'height'), 70, "data from fixtures is saved correctly");

    assert.equal(Person.FIXTURES.length, 1, "Record added to FIXTURES");

    var fixture = Person.FIXTURES[0];

    assert.ok(typeof fixture.id === 'string', "The fixture has an ID generated for it");
    assert.equal(fixture.firstName, 'Paul');
    assert.equal(fixture.lastName, 'Chavard');
    assert.equal(fixture.height, 70);
  }));

  paul.save();
});

test("should update record asynchronously when it is committed", function(assert) {
  assert.equal(Person.FIXTURES.length, 0, "Fixtures is empty");

  var paul = env.store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {
        firstName: 'Paul',
        lastName: 'Chavard',
        height: 70
      }
    }
  });

  paul.set('height', 80);

  paul.on('didUpdate', async(function() {
    assert.equal(get(paul, 'hasDirtyAttributes'), false, "data loads asynchronously");
    assert.equal(get(paul, 'height'), 80, "data from fixtures is saved correctly");

    assert.equal(Person.FIXTURES.length, 1, "Record FIXTURES updated");

    var fixture = Person.FIXTURES[0];

    assert.equal(fixture.firstName, 'Paul');
    assert.equal(fixture.lastName, 'Chavard');
    assert.equal(fixture.height, 80);
  }, 1000));

  paul.save();
});

test("should delete record asynchronously when it is committed", function(assert) {
  var done = assert.async();

  var timer = setTimeout(function() {
    assert.ok(false, "timeout exceeded waiting for fixture data");
    done();
  }, 1000);

  assert.equal(Person.FIXTURES.length, 0, "Fixtures empty");

  var paul = env.store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {
        firstName: 'Paul',
        lastName: 'Chavard',
        height: 70
      }
    }
  });

  paul.save().then(function() {
    paul.deleteRecord();
    paul.save();
  });

  paul.on('didDelete', function() {
    window.clearTimeout(timer);

    assert.equal(get(paul, 'isDeleted'), true, "data deleted asynchronously");
    assert.equal(get(paul, 'hasDirtyAttributes'), false, "data deleted asynchronously");

    assert.equal(Person.FIXTURES.length, 0, "Record removed from FIXTURES");
    done();
  });

});

test("should follow isUpdating semantics", function(assert) {
  var done = assert.async();
  var timer = setTimeout(function() {
    assert.ok(false, "timeout exceeded waiting for fixture data");
    done();
  }, 1000);

  Person.FIXTURES = [{
    id: "twinturbo",
    firstName: "Adam",
    lastName: "Hawkins",
    height: 65
  }];

  var result = env.store.findAll('person');

  result.then(function(all) {
    window.clearTimeout(timer);
    assert.equal(get(all, 'isUpdating'), false, "isUpdating is set when it shouldn't be");
    done();
  });
});

test("should coerce integer ids into string", function(assert) {
  Person.FIXTURES = [{
    id: 1,
    firstName: "Adam",
    lastName: "Hawkins",
    height: 65
  }];

  env.store.findRecord('person', 1).then(async(function(result) {
    assert.strictEqual(get(result, 'id'), "1", "should load integer model id as string");
  }));
});

test("should coerce belongsTo ids into string", function(assert) {
  Person.FIXTURES = [{
    id: 1,
    firstName: "Adam",
    lastName: "Hawkins",

    phones: [1]
  }];

  Phone.FIXTURES = [{
    id: 1,
    person: 1
  }];

  env.store.findRecord('phone', 1).then(async(function(result) {
    get(result, 'person').then(async(function(person) {
      assert.strictEqual(get(person, 'id'), "1", "should load integer belongsTo id as string");
      assert.strictEqual(get(person, 'firstName'), "Adam", "resolved relationship with an integer belongsTo id");
    }));
  }));
});

test("only coerce belongsTo ids to string if id is defined and not null", function(assert) {
  Person.FIXTURES = [];

  Phone.FIXTURES = [{
    id: 1
  }];

  env.store.findRecord('phone', 1).then(async(function(phone) {
    phone.get('person').then(async(function(person) {
      assert.equal(person, null);
    }));
  }));
});

test("should throw if ids are not defined in the FIXTURES", function(assert) {
  Person.FIXTURES = [{
    firstName: "Adam",
    lastName: "Hawkins",
    height: 65
  }];

  assert.throws(function() {
    run(function() {
      env.store.findRecord('person', 1);
    });
  }, /the id property must be defined as a number or string for fixture/);
});

test("0 is an acceptable ID in FIXTURES", function(assert) {
  Person.FIXTURES = [{
    id: 0
  }];

  env.store.findRecord('person', 0).then(async(function() {
    assert.ok(true, "0 is an acceptable ID, so no exception was thrown");
  }), function() {
    assert.ok(false, "should not get here");
  });
});

test("copies fixtures instead of passing the direct reference", function(assert) {
  var returnedFixture;

  assert.expect(2);

  Person.FIXTURES = [{
    id: '1',
    firstName: 'Katie',
    lastName: 'Gengler'
  }];

  var PersonAdapter = FixtureAdapter.extend({
    findRecord: function(store, type, id) {
      return this._super(store, type, id).then(function(fixture) {
        return returnedFixture = fixture;
      });
    }
  });

  var done = assert.async();

  Ember.run(function() {
    env.registry.register('adapter:person', PersonAdapter);
  });

  env.store.findRecord('person', 1).then(function() {
    assert.ok(Person.FIXTURES[0] !== returnedFixture, 'returnedFixture does not have object identity with defined fixture');
    assert.deepEqual(Person.FIXTURES[0], returnedFixture);
    done();
  }, function(err) {
    assert.ok(false, 'got error' + err);
    done();
  });
});

test("should save hasMany records", function(assert) {
  var createPhone, savePerson, assertPersonPhones;

  assert.expect(3);

  Person.FIXTURES = [{ id: 'tomjerry', firstName: "Tom", lastName: "Jerry", height: 3 }];

  createPhone = async(function(tom) {
    env.store.createRecord('phone', { person: tom });

    return tom.get('phones').then(async(function(p) {
      assert.equal(p.get('length'), 1, "hasMany relationships are created in the store");
      return tom;
    }));
  });

  savePerson = async(function(tom) {
    return tom.save();
  });

  assertPersonPhones = async(function(record) {
    var phonesPromise = record.get('phones');

    return phonesPromise.then(async(function(phones) {
      assert.equal(phones.get('length'), 1, "hasMany relationship saved correctly");
    }));
  });

  var ensureFixtureAdapterDoesNotLeak = async(function() {
    env.store.destroy();
    env = setupStore({
      person: Person,
      phone: Phone,
      adapter: { name: 'fixture', factory: FixtureAdapter }
    });

    return env.store.findAll('phone').then(async(function(phones) {
      assert.equal(phones.get('length'), 0, "the fixture adapter should not leak after destroying the store");
    }));
  });
  env.store.findRecord('person', 'tomjerry').then(createPhone)
                                      .then(savePerson)
                                      .then(assertPersonPhones)
                                      .then(ensureFixtureAdapterDoesNotLeak);

});
