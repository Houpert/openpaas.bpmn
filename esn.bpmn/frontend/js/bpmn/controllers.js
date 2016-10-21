'use strict';

angular.module('esn.bpmn')
  .controller('bpmnController', function($scope, $window, $http, bpmnLoader, bpmnService, $modal) {

    $scope.listBpmnFile = listFile();

    var myModal = $modal({title: 'BPMN File', scope: $scope, template: 'bpmnJs/views/modal.html', show: false});
    $scope.showModal = function(id){
      myModal.show();
    };

    var myFormModal = $modal({title: 'Form modal', scope: $scope, template: 'bpmnJs/views/formly.html', show: false});
    $scope.showFormModal = function(id){
      myFormModal.show();
    };

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

    function saveDiagram(done) {
      bpmnModeler.saveXML({ format: true }, function(err, xml) {
        done(err, xml);
      });
    }

    function listFile() {
      var listFile = bpmnService.listFile();
      listFile = ["578d0024ed38236e5dbaf3a9", "578d011498316a86696abd51", "57f4b40adba1804a1c9a5c9b"]
      return listFile;
    }

    $scope.deleteFile = function(id){
      var result = bpmnService.deleteFile(id);
    }

    $scope.readServerFile = function(id){
      bpmnService.selectFile(id).then(function(result) {
        importNewDiagram(result.data);
      }, function(err) {
        alert(err);
      });
    }

    $scope.saveXMLServer = function(){
      saveDiagram(function(err, xml){
        if (err) {
          alert('BPMN isn\'t initialized :'+err);
        } else {
          var blob = new Blob([xml], {type: "text/xml"});
          var fileName = bpmnModeler.definitions.rootElements[0].id;

          var fileOfBlob = new File([blob], fileName);
          bpmnService.writeFile(fileOfBlob);
        }
      });
    }

    $scope.activitiWebService = function(){
      saveDiagram(function(err, xml){
        if (err) {
          alert('BPMN isn\'t initialized :'+err);
        } else {
          var blob = new Blob([xml], {type: "text/xml"});
          var fileName = bpmnModeler.definitions.rootElements[0].id;

          var fileOfBlob = new File([blob], fileName);
          var result = bpmnService.activitiWebService(fileOfBlob);
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
            var fileName = bpmnModeler.definitions.rootElements[0].id;

            var file = new File([xml], fileName, {type: "text/plain"});
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

    <!-- FOR THE DEMO -->

    $scope.activitiWebServiceDemo = function(){
      saveDiagram(function(err, xml){
        if (err) {
          alert('BPMN isn\'t initialized :'+err);
        } else {
          var blob = new Blob([xml], {type: "text/xml"});
          var fileName = bpmnModeler.definitions.rootElements[0].id;

          var fileOfBlob = new File([blob], fileName);
          var result = bpmnService.activitiWebServiceDemo(fileOfBlob);
        }
      });
    }

    <!-- END FOR THE DEMO -->

});
