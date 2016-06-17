'use strict';

angular.module('esn.bpmn')
  .controller('helloWorldController', function($scope, getHelloWorld, bpmnsPropertiesPanel) {
    getHelloWorld.then(function(message) {
      $scope.message = message;
    });

    console.log('##########bpmnsPropertiesPanel', bpmnsPropertiesPanel);
  })

  .controller('bpmnController', function($scope, bpmnFactory, bpmnsPropertiesPanel) {

    var BpmnJS = bpmnFactory.loadBpmnJs();
    var BpmnPanel = bpmnFactory.loadBpmnPanel();

    /*var bpmnJS = new BpmnJS({
      container: '#canvas'
    });*/

    var BpmnViewer = bpmnFactory.loadBpmnJs();
    var viewer = new BpmnViewer({ container: '#canvas' });

    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            viewer.importXML(xhr.response, function(err) {

              if (!err) {
                console.log('success!');
                viewer.get('canvas').zoom('fit-viewport');
              } else {
                console.log('something went wrong:', err);
              }
            });
        }
    };

    xhr.open('GET', '../helloworld/resources/pizza-collaboration.bpmn', true);
    xhr.send(null);

  });
