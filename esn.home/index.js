'use strict';

var AwesomeModule = require('awesome-module');
var Dependency = AwesomeModule.AwesomeModuleDependency;
var path = require('path');

var myAwesomeModule = new AwesomeModule('esn.home', {
  dependencies: [
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.logger', 'logger'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.wrapper', 'webserver-wrapper')
  ],

  states: {
    lib: function(dependencies, callback) {
      var homeLib = require('./backend/lib')(dependencies);
      var home = require('./backend/webserver/api/home')(dependencies);

      var lib = {
        api: {
          home: home
        },
        lib: homeLib
      };

      return callback(null, lib);
    },

    deploy: function(dependencies, callback) {
      // Register the webapp
      var app = require('./backend/webserver')(dependencies, this);
      // Register every exposed endpoints
      app.use('/', this.api.home);

      var webserverWrapper = dependencies('webserver-wrapper');
      // Register every exposed frontend scripts
      var jsFiles = [
        'app.js',
        'core/controllers.js'
      ];
      webserverWrapper.injectAngularModules('home', jsFiles, ['esn.home'], ['esn']);
      var lessFile = path.resolve(__dirname, './frontend/css/styles.less');
      webserverWrapper.injectLess('home', [lessFile], 'esn');
      webserverWrapper.addApp('home', app);

      return callback();
    }
  }
});

/**
 * The main AwesomeModule describing the application.
 * @type {AwesomeModule}
 */
module.exports = myAwesomeModule;
