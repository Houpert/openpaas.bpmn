'use strict';

var AwesomeModule = require('awesome-module');
var Dependency = AwesomeModule.AwesomeModuleDependency;
var path = require('path');

var myAwesomeModule = new AwesomeModule('esn.bpmn', {
  dependencies: [
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.logger', 'logger'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.wrapper', 'webserver-wrapper')
  ],

  states: {
    lib: function(dependencies, callback) {
      var bpmnlib = require('./backend/lib')(dependencies);
      var bpmn = require('./backend/webserver/api/bpmn')(dependencies);

      var lib = {
        api: {
          bpmn: bpmn
        },
        lib: bpmnlib
      };

      return callback(null, lib);
    },

    deploy: function(dependencies, callback) {
      // Register the webapp
      var app = require('./backend/webserver')(dependencies, this);
      // Register every exposed endpoints
      app.use('/', this.api.bpmn);

      var webserverWrapper = dependencies('webserver-wrapper');
      // Register every exposed frontend scripts
      var angularFiles = [
        'app.js',
        'bpmn/services.js',
        'bpmn/directives.js',
        'bpmn/controllers.js',
        'bpmn-js/bpmn.js',
        'bpmn-js/bpmnPanel.js',
        'bpmn-js/bpmnPanelProvider.js',
        'bpmn-js/camunda.js',
        'bpmn-js/brfs.js'
      ];

      webserverWrapper.injectAngularModules('helloworld', angularFiles, ['esn.bpmn'], ['esn']);
      var lessFile = path.resolve(__dirname, './frontend/css/styles.less');
      webserverWrapper.injectLess('helloworld', [lessFile], 'esn');
      webserverWrapper.addApp('helloworld', app);

      return callback();
    }
  }
});

/**
 * The main AwesomeModule describing the application.
 * @type {AwesomeModule}
 */
module.exports = myAwesomeModule;
