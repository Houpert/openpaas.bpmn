'use strict';

angular.module('esn.bpmn')
  .controller('bpmnController', function($scope, $window, bpmnJs, bpmnPropertiesPanel, bpmnPropertiesPanelProvider) {

    var newDiagramXML =  "<?xml version=\"1.0\" encoding=\"UTF-8\"?><bpmn:definitions xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:bpmn=\"http://www.omg.org/spec/BPMN/20100524/MODEL\" xmlns:bpmndi=\"http://www.omg.org/spec/BPMN/20100524/DI\" xmlns:dc=\"http://www.omg.org/spec/DD/20100524/DC\" xmlns:di=\"http://www.omg.org/spec/DD/20100524/DI\" id=\"Definitions_1\" targetNamespace=\"http://bpmn.io/schema/bpmn\"><bpmn:process id=\"Process_1\" isExecutable=\"false\"><bpmn:startEvent id=\"StartEvent_1\" /></bpmn:process><bpmndi:BPMNDiagram id=\"BPMNDiagram_1\"><bpmndi:BPMNPlane id=\"BPMNPlane_1\" bpmnElement=\"Process_1\"><bpmndi:BPMNShape id=\"_BPMNShape_StartEvent_2\" bpmnElement=\"StartEvent_1\"><dc:Bounds x=\"173\" y=\"102\" width=\"36\" height=\"36\" /></bpmndi:BPMNShape></bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>"

    var $ = $window.jQuery,
        BpmnModeler = bpmnJs;

    var propertiesPanelModule = bpmnPropertiesPanel,
        propertiesProviderModule = bpmnPropertiesPanelProvider;

    var container = $('#js-drop-zone');
    var canvas = $('#js-canvas');

    var bpmnModeler = new BpmnModeler({
      container: canvas,
      propertiesPanel: {
        parent: '#js-properties-panel'
      },
      additionalModules: [
        propertiesPanelModule,
        propertiesProviderModule
      ]
    });

    function createNewDiagramFile(newXml) {
      openDiagram(newXml);
    }

    function initDiagram() {
      openDiagram(newDiagramXML);
    }

    function openDiagram(xml) {
      bpmnModeler.importXML(xml, function(err) {

        if (err) {
          container
            .removeClass('with-diagram')
            .addClass('with-error');

          container.find('.error pre').text(err.message);
          console.error(err);
        } else {
          container
            .removeClass('with-error')
            .addClass('with-diagram');
        }
      });
    }

    function saveSVG(done) {
      bpmnModeler.saveSVG(done);
    }

    function saveDiagram(done) {
      bpmnModeler.saveXML({ format: true }, function(err, xml) {
        done(err, xml);
      });
    }

    initDiagram();
    $scope.saveXML = function(){
      //TODO
    }

    $scope.printTest = function(){
      //TODO TEST

      console.log(bpmnModeler);
    }


    $scope.file_changed = function(element) {
      var newXml = undefined;
      $scope.$apply(function(scope) {
         var fileXML = element.files[0];
         var reader = new FileReader();
         reader.onload = function(xml) {
            createNewDiagramFile(xml.target.result);
         };

        newXml = reader.readAsBinaryString(fileXML);
      });

    };
});
