import DS from 'ember-data';
import Ember from 'ember';

var get = Ember.get;
var indexOf = Array.prototype.indexOf && function(array, item) {
  return array.indexOf(item);
} || Ember.EnumerableUtils.indexOf;

var map = Array.prototype.map && function(array, cb, binding) {
  return array.map(cb, binding);
} || Ember.EnumerableUtils.map;

var counter = 0;

/**
  `DS.FixtureAdapter` is an adapter that loads records from memory.
  It's primarily used for development and testing. You can also use
  `DS.FixtureAdapter` while working on the API but is not ready to
  integrate yet. It is a fully functioning adapter. All CRUD methods
  are implemented. You can also implement query logic that a remote
  system would do. It's possible to develop your entire application
  with `DS.FixtureAdapter`.

  For information on how to use the `FixtureAdapter` in your
  application please see the [FixtureAdapter
  guide](/guides/models/the-fixture-adapter/).

  @class FixtureAdapter
  @namespace DS
  @extends DS.Adapter
*/
export default DS.Adapter.extend({
  defaultSerializer: '-default',

  // The fixture adapter does not support coalesceFindRequests
  coalesceFindRequests: false,

  /**
    If `simulateRemoteResponse` is `true` the `FixtureAdapter` will
    wait a number of milliseconds before resolving promises with the
    fixture values. The wait time can be configured via the `latency`
    property.

    @property simulateRemoteResponse
    @type {Boolean}
    @default true
  */
  simulateRemoteResponse: true,

  /**
    By default the `FixtureAdapter` will simulate a wait of the
    `latency` milliseconds before resolving promises with the fixture
    values. This behavior can be turned off via the
    `simulateRemoteResponse` property.

    @property latency
    @type {Number}
    @default 50
  */
  latency: 50,

  /**
    Implement this method in order to provide data associated with a type

    @method fixturesForType
    @param {Subclass of DS.Model} typeClass
    @return {Array}
  */
  fixturesForType(typeClass) {
    if (typeClass.FIXTURES) {
      var fixtures = typeClass.FIXTURES;
      return map(fixtures, (fixture) => {
        var fixtureIdType = typeof fixture.id;
        if (fixtureIdType !== 'number' && fixtureIdType !== 'string') {
          throw new Error(`the id property must be defined as a number or string for fixture ${fixture}`);
        }
        fixture.id = fixture.id + '';
        return fixture;
      });
    }
    return null;
  },

  /**
    Implement this method in order to query fixtures data

    @method queryFixtures
    @param {Array} fixture
    @param {Object} query
    @param {Subclass of DS.Model} typeClass
    @return {Promise|Array}
  */
  queryFixtures(/*fixtures, query, typeClass*/) {
    Ember.assert('Not implemented: You must override the DS.FixtureAdapter::queryFixtures method to support querying the fixture store.');
  },

  /**
    @method updateFixtures
    @param {Subclass of DS.Model} typeClass
    @param {Array} fixture
  */
  updateFixtures(typeClass, fixture) {
    if (!typeClass.FIXTURES) {
      typeClass.reopenClass({
        FIXTURES: []
      });
    }

    var fixtures = typeClass.FIXTURES;

    this.deleteLoadedFixture(typeClass, fixture);

    fixtures.push(fixture);
  },

  /**
    Implement this method in order to provide json for CRUD methods

    @method mockJSON
    @param {DS.Store} store
    @param {Subclass of DS.Model} typeClass
    @param {DS.Snapshot} snapshot
  */
  mockJSON(store, typeClass, snapshot) {
    return store.serializerFor(snapshot.modelName).serialize(snapshot, { includeId: true });
  },

  /**
    @method generateIdForRecord
    @param {DS.Store} store
    @param {DS.Model} record
    @return {String} id
  */
  generateIdForRecord(/*store*/) {
    return `fixture-${counter++}`;
  },

  /**
    @method find
    @param {DS.Store} store
    @param {subclass of DS.Model} typeClass
    @param {String} id
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  findRecord(store, typeClass, id/*, snapshot*/) {
    var fixtures = this.fixturesForType(typeClass);
    var fixture;

    Ember.assert(`Unable to find fixtures for model type ${typeClass.toString()}. If you're defining your fixtures using 'Model.FIXTURES = ...'', please change it to 'Model.reopenClass({ FIXTURES: ... })'.`, fixtures);

    if (fixtures) {
      fixture = Ember.A(fixtures).findBy('id', id);
    }

    if (fixture) {
      return this.simulateRemoteCall(() => fixture);
    }
  },

  /**
    @method findMany
    @param {DS.Store} store
    @param {subclass of DS.Model} typeClass
    @param {Array} ids
    @param {Array} snapshots
    @return {Promise} promise
  */
  findMany(store, typeClass, ids/*, snapshots*/) {
    var fixtures = this.fixturesForType(typeClass);

    Ember.assert(`Unable to find fixtures for model type ${typeClass.toString()}`, fixtures);

    if (fixtures) {
      fixtures = fixtures.filter(item => indexOf(ids, item.id) !== -1);
    }

    if (fixtures) {
      return this.simulateRemoteCall(() => fixtures);
    }
  },

  /**
    @private
    @method findAll
    @param {DS.Store} store
    @param {subclass of DS.Model} typeClass
    @param {String} sinceToken
    @return {Promise} promise
  */
  findAll(store, typeClass) {
    var fixtures = this.fixturesForType(typeClass);

    Ember.assert(`Unable to find fixtures for model type ${typeClass.toString()}`, fixtures);

    return this.simulateRemoteCall(() => fixtures);
  },

  /**
    @private
    @method findQuery
    @param {DS.Store} store
    @param {subclass of DS.Model} typeClass
    @param {Object} query
    @param {DS.AdapterPopulatedRecordArray} recordArray
    @return {Promise} promise
  */
  query(store, typeClass, query/*, array*/) {
    var fixtures = this.fixturesForType(typeClass);

    Ember.assert(`Unable to find fixtures for model type ${typeClass.toString()}`, fixtures);

    fixtures = this.queryFixtures(fixtures, query, typeClass);

    if (fixtures) {
      return this.simulateRemoteCall(() => fixtures);
    }
  },

  /**
    @method createRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} typeClass
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  createRecord(store, typeClass, snapshot) {
    var fixture = this.mockJSON(store, typeClass, snapshot);

    this.updateFixtures(typeClass, fixture);

    return this.simulateRemoteCall(() => fixture);
  },

  /**
    @method updateRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  updateRecord(store, typeClass, snapshot) {
    var fixture = this.mockJSON(store, typeClass, snapshot);

    this.updateFixtures(typeClass, fixture);

    return this.simulateRemoteCall(() => fixture);
  },

  /**
    @method deleteRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} typeClass
    @param {DS.Snapshot} snapshot
    @return {Promise} promise
  */
  deleteRecord(store, typeClass, snapshot) {
    this.deleteLoadedFixture(typeClass, snapshot);

    return this.simulateRemoteCall(() => null);
  },

  /*
    @method deleteLoadedFixture
    @private
    @param typeClass
    @param snapshot
  */
  deleteLoadedFixture(typeClass, snapshot) {
    var existingFixture = this.findExistingFixture(typeClass, snapshot);

    if (existingFixture) {
      var index = indexOf(typeClass.FIXTURES, existingFixture);
      typeClass.FIXTURES.splice(index, 1);
      return true;
    }
  },

  /*
    @method findExistingFixture
    @private
    @param typeClass
    @param snapshot
  */
  findExistingFixture(typeClass, snapshot) {
    var fixtures = this.fixturesForType(typeClass);
    var id = snapshot.id;

    return this.findFixtureById(fixtures, id);
  },

  /*
    @method findFixtureById
    @private
    @param fixtures
    @param id
  */
  findFixtureById(fixtures, id) {
    return Ember.A(fixtures).find((r) => '' + get(r, 'id') === '' + id);
  },

  /*
    @method simulateRemoteCall
    @private
    @param callback
    @param context
  */
  simulateRemoteCall(callback, context) {
    var adapter = this;

    return new Ember.RSVP.Promise(function(resolve) {
      var value = Ember.copy(callback.call(context), true);
      if (get(adapter, 'simulateRemoteResponse')) {
        // Schedule with setTimeout
        Ember.run.later(null, resolve, value, get(adapter, 'latency'));
      } else {
        // Asynchronous, but at the of the runloop with zero latency
        resolve(value);
      }
    }, 'DS: FixtureAdapter#simulateRemoteCall');
  }
});
