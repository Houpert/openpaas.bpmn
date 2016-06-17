'use strict';

angular.module('esn.bpmn')
  .controller('helloWorldController', function($scope, getHelloWorld) {
    getHelloWorld.then(function(message) {
      $scope.message = message;
    });

  })

  .controller('bpmnController', function($scope, bpmnJs, bpmnPropertiesPanel, bpmnPropertiesPanelProvider) {

    var BpmnJS = bpmnJs,
        propertiesPanelModule = bpmnPropertiesPanel,
        propertiesProviderModule = bpmnPropertiesPanelProvider;

    var bpmnJS = new BpmnJS({
      additionalModules: [
        propertiesPanelModule,
        propertiesProviderModule
      ],
      container: '#canvas',
      propertiesPanel: {
        parent: '#properties'
      }
    });

  });
