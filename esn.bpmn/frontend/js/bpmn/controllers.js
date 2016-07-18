'use strict';

angular.module('esn.bpmn')
  .controller('bpmnController', function($scope, $window, $http, bpmnLoader, bpmnService) {

    var initDiagramXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><bpmn:definitions xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:bpmn=\"http://www.omg.org/spec/BPMN/20100524/MODEL\" xmlns:bpmndi=\"http://www.omg.org/spec/BPMN/20100524/DI\" id=\"Definitions_1\" targetNamespace=\"http://bpmn.io/schema/bpmn\"><bpmn:process id=\"Process_1\" isExecutable=\"false\" /><bpmndi:BPMNDiagram id=\"BPMNDiagram_1\"><bpmndi:BPMNPlane id=\"BPMNPlane_1\" bpmnElement=\"Process_1\" /></bpmndi:BPMNDiagram></bpmn:definitions>"

    var $ = $window.jQuery,
        BpmnModeler = bpmnLoader.bpmnModeler();

    var propertiesPanelModule = bpmnLoader.bpmnPropertiesPanel(),
        propertiesProviderModule = bpmnLoader.bpmnPropertiesPanelProvider();

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
      ],
      moddleExtensions: {
        camunda: bpmnLoader.camundaModdleDescriptor()
      }
    });

    function importNewDiagram(importXml) {
      openDiagram(importXml);
    }

    function initDiagram() {
      openDiagram(initDiagramXml);
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
    /*
    function saveSVG(done) {
      bpmnModeler.saveSVG(done);
    }
    saveSVG(function(err, xml){
          //do some ajax thing
    });*/

    function saveDiagram(done) {
      bpmnModeler.saveXML({ format: true }, function(err, xml) {
        done(err, xml);
      });
    }

    $scope.listFile = function(){
      var result = bpmnService.listFile();
      console.log(result);
    }

    $scope.readServerFile = function(id){
      //TODO Manage listFile for good id
      id = "578d011498316a86696abd51";  //TODO remove when list file is done

      bpmnService.selectFile(id).then(function(result) {
        importNewDiagram(result.data);
      }, function(err) {
        alert(err);
      });
    }

    $scope.saveXMLServer = function(fileName){
      saveDiagram(function(err, xml){
        if (err) {
          alert('BPMN isn\'t initialized :'+err);
        } else {
          var blob = new Blob([xml], {type: "text/xml"});
          if(fileName === undefined)
            fileName = 'defaultBPMN_Name';

          var fileOfBlob = new File([blob], fileName+'.xml');
          bpmnService.writeFile(fileOfBlob);
        }
      });
    }



    $scope.initDiagram = function(){
      initDiagram();
    }

    $scope.saveXML = function(){
      saveDiagram(function(err, xml){
        if (err) {
          alert('BPMN isn\'t initialized');
        } else {
          if (saveAs) {
            var file = new File([xml], "BPMN.xml", {type: "text/plain"});
            saveAs(file);
          }else{
              alert('Save file is not supported');
          }
        }
      });
    }

    $scope.file_changed = function(element) {
      var newXml = undefined;

      $scope.$apply(function(scope) {
         var fileXML = element.files[0];
         var reader = new FileReader();
         reader.onload = function(xml) {
            importNewDiagram(xml.target.result);
         };

        newXml = reader.readAsBinaryString(fileXML);
      });


    initDiagram();

    };
});
