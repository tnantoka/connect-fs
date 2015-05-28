/*!
 * Connect - FileSystem
 * Copyright(c) 2011 tnantoka <bornneet@livedoor.com>
 * MIT Licensed
 * forked from https://github.com/visionmedia/connect-redis
 */

/**
 * Module dependencies.
 */

var fs = require('fs');
var path = require('path');
var events = require('events');
var jsonString = require('json-string');

/**
 * One day in milliseconds.
 */

var oneDay = 86400 * 1000;

/**
 * Return the `FSStore` extending a `connect` session Store.
 *
 * @param {object} session store
 * @return {Function}
 * @api public
 */

module.exports = function(session){
  'use strict';
  /**
   * Connect's Store.
   */

  var Store = session.Store;

  /**
   * Initialize FSStore with the given `options`.
   *
   * @param {Object} options
   * @api public
   */

  function FSStore(options) {
    options = options || {};
    Store.call(this, options);

    this.client = new events.EventEmitter();
    var self = this;

    this.dir = options.dir || './sessions';
    this.beautify = options.beautify ? typeof options.beautify === 'object' ? options.beautify : {sortKeys: false} : false;

    fs.stat(this.dir, function(err, stats) {
      // ENOENT, No such file or directory is not an error.
      if (err && err.code != 'ENOENT') throw err;
      if (stats && stats.isDirectory()) {
        self.client.emit('connect');
      } else {
        fs.mkdir(self.dir, '0755', function(err) {
          if (err) throw err;
          self.client.emit('connect');
        });
      }
    });

    // interval for reaping stale sessions.
    this.reapInterval = options.reapInterval ? parseInt(options.reapInterval) : 0;
    if (this.reapInterval > 0) {
        setInterval(function (self) {
            self.reap();
        }, this.reapInterval, this);
    }
  }

  /**
   * Inherit from `Store`.
   */

  FSStore.prototype.__proto__ = Store.prototype;

  /**
   * Reap expired sessions.
   * @api private
   */
  FSStore.prototype.reap = function () {
      var now = new Date().getTime();
      var self = this;
      //console.log("deleting old sessions");
      var checkExpiration = function(filePath) {
          fs.readFile(filePath, function (err, data) {
              if(!err) {
                  data = JSON.parse(data);
                  if (data.expired && data.expired < now) {
                      //console.log("deleted file " + filePath);
                      fs.unlink(filePath);
                  }
              }
          });
      };
      fs.readdir(self.dir, function(err, files) {
          if(err || files.length <= 0) {
              return;
          }
          files.forEach(function(file, i) {
              if (/\.json$/.test(files[i])) {
                  checkExpiration(path.join(self.dir, files[i]));
              }
          });
      });
  };

  /**
   * Attempt to fetch session by the given `sid`.
   *
   * @param {String} sid
   * @param {Function} fn
   * @api public
   */

  FSStore.prototype.get = function(sid, fn){
    var now = new Date().getTime(),
        file = path.join(this.dir, sid + '.json');
    (fs.exists || path.exists)(file, function(exists){
      if(!exists) return fn();

      fs.readFile(file, 'UTF-8', function(err, data) {
          // errno=2, 32: ENOENT, No such file or directory is not an error.
          if (err && err.errno != 2 && err.errno != 32) throw err;
          // AssesionError occurs !?
          //console.log(sid);
          //console.log(err);
          //try {
            if (!data) {
              // no session file
              // the file is somehow empty. not much we can do, just continue.
              return fn();
            }
            data = JSON.parse(data);
            if (data.expired < now) {
              return fn();
            } else {
              delete data.expired;
              fn(null, data);
            }
          //} catch (e) {
          //  fn(e);
          //}
        }
      );
    });
  };


  /**
   * Commit the given `sess` object associated with the given `sid`.
   *
   * @param {String} sid
   * @param {Session} sess
   * @param {Function} fn
   * @api public
   */

  FSStore.prototype.set = function(sid, sess, fn) {
    try {
      var maxAge = sess.cookie.maxAge;
      var now = new Date().getTime();
      var expired = maxAge ? now + maxAge : now + oneDay;
      sess.expired = expired;
      sess = !!this.beautify ? jsonString(sess, this.beautify) : JSON.stringify(sess);

      fs.writeFile(path.join(this.dir, sid + '.json'), sess, function(err) {
//        if (fn) fn.apply(this, arguments);
        if (fn) {
          if (err) fn(err);
          fn(null, true);
        }
      });
    } catch (e) {
      if (fn) fn(e);
    }
  };


  /**
   * Destroy the session associated with the given `sid`.
   *
   * @param {String} sid
   * @api public
   */

  FSStore.prototype.destroy = function(sid, fn){
    fs.unlink(path.join(this.dir, sid + '.json'), fn);
  };


  /**
   * Fetch number of sessions.
   *
   * @param {Function} fn
   * @api public
   */

  FSStore.prototype.length = function(fn){
    fs.readdir(this.dir, function(err, files) {
      if (err) fn(err);
      var length = 0;
      for (var i = 0; i < files.length; i++) {
        if (/\.json$/.test(files[i])) {
          length++;
        }
      }
      fn(null, length);
    });
  };


  /**
   * Clear all sessions.
   *
   * @param {Function} fn
   * @api public
   */

  FSStore.prototype.clear = function(fn){
    var self = this;
    var count = 0;
    this.length(function(err, length) {
      fs.readdir(self.dir, function(err, files) {
        if (err) fn(err);
        for (var i = 0; i < files.length; i++) {
          if (/\.json$/.test(files[i])) {
            fs.unlink(path.join(self.dir, files[i]), function(err) {
              if (err) fn(err);
              if (++count == length) fn(null, true);
            });
          }
        }
      });
    });
  };

  return FSStore;
};
