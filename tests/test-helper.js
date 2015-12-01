import QUnit from 'qunit';
import DS from 'ember-data';
import Ember from 'ember';
import resolver from './helpers/resolver';
import {
  setResolver
} from 'ember-qunit';
import FixtureAdapter from 'ember-data-fixture-adapter';

export function setupStore(options) {
  var emberChannel = QUnit.urlParams.emberchannel || "release";
  var env = {};
  options = options || {};

  var registry = env.registry = new Ember.Registry();
  var container = env.container = registry.container();

  env.replaceContainerNormalize = function replaceContainerNormalize(fn) {
    if (env.registry) {
      env.registry.normalize = fn;
    } else {
      env.container.normalize = fn;
    }
  };

  var adapter = env.adapter = (options.adapter || DS.Adapter);
  delete options.adapter;

  for (var prop in options) {
    registry.register('model:' + prop, options[prop]);
  }

  registry.register('store:main', DS.Store.extend({
    adapter: adapter.name
  }));

  registry.register('serializer:-default', DS.JSONSerializer);
  registry.register('serializer:-rest', DS.RESTSerializer);
  registry.register('adapter:-rest', DS.RESTAdapter);

  registry.register('adapter:' + adapter.name, adapter.factory);

  registry.injection('serializer', 'store', 'store:main');

  env.serializer = container.lookup('serializer:-default');
  env.restSerializer = container.lookup('serializer:-rest');
  env.store = container.lookup('store:main');
  env.adapter = env.store.get('defaultAdapter');

  return env;
}

QUnit.begin(function(){
  Ember.RSVP.configure('onerror', function(reason) {
    // only print error messages if they're exceptions;
    // otherwise, let a future turn of the event loop
    // handle the error.
    if (reason && reason instanceof Error) {
      Ember.Logger.log(reason, reason.stack);
      throw reason;
    }
  });

  var transforms = {
    'boolean': DS.BooleanTransform.create(),
    'date': DS.DateTransform.create(),
    'number': DS.NumberTransform.create(),
    'string': DS.StringTransform.create()
  };

  // Prevent all tests involving serialization to require a container
  DS.JSONSerializer.reopen({
    transformFor: function(attributeType) {
      return this._super(attributeType, true) || transforms[attributeType];
    }
  });

});

export function async(callback, timeout) {
  var timer;
  QUnit.stop();

  timer = setTimeout(function() {
    QUnit.start();
    QUnit.ok(false, "Timeout was reached");
  }, timeout || 200);

  return function() {
    window.clearTimeout(timer);

    QUnit.start();

    var args = arguments;
    return Ember.run(function() {
      return callback.apply(this, args);
    });
  };
}

setResolver(resolver);
