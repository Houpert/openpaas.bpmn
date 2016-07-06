'use strict';

angular.module('esn.bpmn')
  .controller('bpmnController', function($scope, $window, bpmnJs, bpmnPropertiesPanel, bpmnPropertiesPanelProvider, camunda) {

    var newDiagramXML =  "<?xml version=\"1.0\" encoding=\"UTF-8\"?><bpmn:definitions xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:bpmn=\"http://www.omg.org/spec/BPMN/20100524/MODEL\" xmlns:bpmndi=\"http://www.omg.org/spec/BPMN/20100524/DI\" xmlns:dc=\"http://www.omg.org/spec/DD/20100524/DC\" xmlns:di=\"http://www.omg.org/spec/DD/20100524/DI\" id=\"Definitions_1\" targetNamespace=\"http://bpmn.io/schema/bpmn\"><bpmn:process id=\"Process_1\" isExecutable=\"false\"><bpmn:startEvent id=\"StartEvent_1\" /></bpmn:process><bpmndi:BPMNDiagram id=\"BPMNDiagram_1\"><bpmndi:BPMNPlane id=\"BPMNPlane_1\" bpmnElement=\"Process_1\"><bpmndi:BPMNShape id=\"_BPMNShape_StartEvent_2\" bpmnElement=\"StartEvent_1\"><dc:Bounds x=\"173\" y=\"102\" width=\"36\" height=\"36\" /></bpmndi:BPMNShape></bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>"

    var $ = $window.jQuery,
        BpmnModeler = bpmnJs;

    var propertiesPanelModule = bpmnPropertiesPanel,
        propertiesProviderModule = bpmnPropertiesPanelProvider,
        camundaModdleDescriptor = camunda;


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
            camunda: camundaModdleDescriptor
          }
        });

        function createNewDiagram() {
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

        function registerFileDrop(container, callback) {

          function handleFileSelect(e) {
            e.stopPropagation();
            e.preventDefault();

            var files = e.dataTransfer.files;

            var file = files[0];

            var reader = new FileReader();

            reader.onload = function(e) {

              var xml = e.target.result;

              callback(xml);
            };

            reader.readAsText(file);
          }

          function handleDragOver(e) {
            e.stopPropagation();
            e.preventDefault();

            e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
          }

          container.get(0).addEventListener('dragover', handleDragOver, false);
          container.get(0).addEventListener('drop', handleFileSelect, false);
        }


        ////// file drag / drop ///////////////////////

        // check file api availability
        if (!window.FileList || !window.FileReader) {
          window.alert(
            'Looks like you use an older browser that does not support drag and drop. ' +
            'Try using Chrome, Firefox or the Internet Explorer > 10.');
        } else {
          registerFileDrop(container, openDiagram);
        }

        // bootstrap diagram functions

        $(document).on('ready', function() {

          $('#js-create-diagram').click(function(e) {
            e.stopPropagation();
            e.preventDefault();

            createNewDiagram();
          });

          var downloadLink = $('#js-download-diagram');
          var downloadSvgLink = $('#js-download-svg');

          $('.buttons a').click(function(e) {
            if (!$(this).is('.active')) {
              e.preventDefault();
              e.stopPropagation();
            }
          });

          function setEncoded(link, name, data) {
            var encodedData = encodeURIComponent(data);

            if (data) {
              link.addClass('active').attr({
                'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
                'download': name
              });
            } else {
              link.removeClass('active');
            }
          }

          var debounce = require('lodash/function/debounce');

          var exportArtifacts = debounce(function() {

            saveSVG(function(err, svg) {
              setEncoded(downloadSvgLink, 'diagram.svg', err ? null : svg);
            });

            saveDiagram(function(err, xml) {
              setEncoded(downloadLink, 'diagram.bpmn', err ? null : xml);
            });
          }, 500);

          bpmnModeler.on('commandStack.changed', exportArtifacts);
        });





createNewDiagram(newDiagramXML);









    /*var BpmnJS = bpmnJs,
        propertiesPanelModule = bpmnPropertiesPanel,
        propertiesProviderModule = bpmnPropertiesPanelProvider;*/

    /*  var BpmnViewer = bpmnJs;
      var pizzaDiagram =  "<?xml version=\"1.0\" encoding=\"UTF-8\"?><bpmn:definitions xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:bpmn=\"http://www.omg.org/spec/BPMN/20100524/MODEL\" xmlns:bpmndi=\"http://www.omg.org/spec/BPMN/20100524/DI\" xmlns:dc=\"http://www.omg.org/spec/DD/20100524/DC\" xmlns:di=\"http://www.omg.org/spec/DD/20100524/DI\" id=\"Definitions_1\" targetNamespace=\"http://bpmn.io/schema/bpmn\"><bpmn:process id=\"Process_1\" isExecutable=\"false\"><bpmn:startEvent id=\"StartEvent_1\" /></bpmn:process><bpmndi:BPMNDiagram id=\"BPMNDiagram_1\"><bpmndi:BPMNPlane id=\"BPMNPlane_1\" bpmnElement=\"Process_1\"><bpmndi:BPMNShape id=\"_BPMNShape_StartEvent_2\" bpmnElement=\"StartEvent_1\"><dc:Bounds x=\"173\" y=\"102\" width=\"36\" height=\"36\" /></bpmndi:BPMNShape></bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>"

      console.log(pizzaDiagram);

      var viewer = new BpmnViewer({ container: '#canvas' });

      viewer.importXML(pizzaDiagram, function(err) {

        if (!err) {
          console.log('success!');
          viewer.get('canvas').zoom('fit-viewport');
        } else {
          console.log('something went wrong:', err);
      }
    });*/





  });
