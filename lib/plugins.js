/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter;
var debug = require('debug')('duo');
var Step = require('step.js');
var path = require('path');
var thunk = require('thunkify');

/**
 * Export `Plugins`.
 */

module.exports = Plugins;

var inflights = {};

function Plugins() {
  if (!(this instanceof Plugins)) return new Plugins();
  Emitter.call(this);

  this.hooks = {};
  this.init('install');
  this.init('resolve');
  this.init('transform');
  this.init('pack');  
}

/**
 * Inherit from `Emitter`.
 */
Plugins.prototype.__proto__ = Emitter.prototype;

/**
 * Register a hook
 *
 * @param {String} hook name
 */
Plugins.prototype.init = function (hook) {
  this.hooks[hook] = new Step;
  this.hooks[hook].run = thunk(this.hooks[hook].run);
}

/**
 * Register a hook function
 *
 * @param {String} hook name
 * @param {Function} function to register
 * @api private
 */
Plugins.prototype.use = function (hook, fn) {
  if (Array.isArray(fn)) {
    fn.forEach(this.use, hook, this);
    return this;
  } else {
    if (~this.hooks[hook].fns.indexOf(fn)) return this;
    var name = fn.name || '(anonymous)';
    this.emit('plugin', hook + ':' + name);
    debug('using plugin: %s (%s)', name, hook);
    this.hooks[hook].use(fn);
    return this;
  }
};

/**
 * Run all registed functions for this hook
 *
 * @param {String} hook name
 * @param {String} synchronization key
 * @param {Any} arg to pass to registered hooks
 * @param {Any} arg to pass to registered hooks
 * @param {Any} arg to pass to registered hooks
 * @api private
 */
Plugins.prototype.run = function* (hook, key, arg1, arg2, arg3) {
  var self = this;
  var id = hook + '-' + key;

  // inflight, wait till other package completes
  while (inflights[id]) {
    debug(id + ': yielding');
    yield function(done){ self.once(id, done); };
  }

  inflights[id] = true;
  debug(id + ': flying');
  var result = yield self.hooks[hook].run(arg1, arg2);
  inflights[id] = false;

  // notify waiters
  self.emit(id);

  return result;
}

/**
 * Register an install function
 * Install functions look like function*(pkg) {}
 * 
 * @param {Function} function to register 
 * @api public
 */
Plugins.prototype.useInstall = function (fn) {
  return this.use('install', fn)
};

/**
 * Register a resolve hook
 * Resolve hook look like function*(dep, file, entry) { return newdep }
 *
 * @param {Function} function to register
 * @api public
 */
Plugins.prototype.useResolve = function (fn) {
  return this.use('resolve', fn)
};

/**
 * Register a transform hook
 * Transform hooks look like function*(file, entry) { }
 *
 * @param {Function} function to register
 * @api public
 */
Plugins.prototype.useTransform = function (fn) {
  return this.use('transform', fn)
};

/**
 * Register a packing hook
 * Packing hooks look like function*(mapping) { }
 *
 * @param {Function} function to register
 * @api public
 */
Plugins.prototype.usePack = function (fn) {
  return this.use('pack', fn)
};

/**
 * Run the install hook after fetching the package
 *
 * @param {DuoPackage} package
 * @api public
 */
Plugins.prototype.runInstall = function* (pkg) {
  return yield this.run('install', pkg.name, pkg);
};

/**
 * Run the resolve hook to try and resolve the dependency
 *
 * @param {String} dependency name
 * @param {DuoFile} file
 * @param {DuoFile} entry file
 * @return resolved dependency name
 * @api public
 */
Plugins.prototype.runResolve = function* (dep, file, entry) {
  if (this.hooks['resolve'].fns.length > 0) {
    var res = yield this.run('resolve', dep, dep, file, entry);
    if (res && res.length > 0)
      return res[0];
    else
      return dep;
  }
  else
    return dep;
};

/**
 * Run the transform hook on each file
 *
 * @param {DuoFile} file
 * @param {DuoFile} entry file
 * @api public
 */
Plugins.prototype.runTransform = function* (file, entry) {
  return yield this.run('transform', file.path, file, entry);
};

/**
 * Run the package hook to allow changes to duo.json before packaging ?
 *
 * @param {DuoMapping} mapping
 * @api public
 */
Plugins.prototype.runPack = function* (mapping) {
  return yield this.run('pack', 'mapping', mapping);
};

