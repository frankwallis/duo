/**
 * Module dependencies.
 */

var expect = require('expect.js');
var File = require('../lib/file');
var join = require('path').join;
var assert = require('assert');
//var fs = require('co-fs');
//var Duo = require('..');

var Plugins = require('../lib/plugins');

/**
 * Tests.
 */

describe('Plugins Module', function () {

  it('should run transform plugins', function () {
  	var plugins = new Plugins();
  	var called = false;
  	plugins.use('transform', function*(file, entry) {
  		called = true;
  	});
  	plugins.run('transform');
    assert(called);
  });

  // it('should synchronize install plugins by package', function () {
  // 	var plugins = new Plugins();
  // 	var called = 0;

  // 	plugins.use('transform', function*(file, entry) {
  // 		called = true;
  // 	});
  // 	plugins.run('transform');
  //   assert(called);
  // });
});