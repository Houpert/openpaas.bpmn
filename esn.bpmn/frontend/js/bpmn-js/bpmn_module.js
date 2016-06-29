'use strict';
angular.module('bpmn-js', [])
.factory('bpmnFactory', function($window) {

    var BpmnJsLoader = function() {
      console.log('BpmnJsLoader');
      console.log($window.BpmnJS);
      return $window.BpmnJS;
     };
     var BpmnPanelLoader = function() {
       console.log('BpmnPanelLoader');
       //console.log($windows.BpmnPanelLoader);
       console.log($window);

      //code bpmn-js-properties-panel
     };
     var PropertiesProviderModuleLoader = function(){
       //code bpmn-js-properties-panel/lib/provider/camunda
     };
     return {
       loadBpmnJs: BpmnJsLoader,
       loadBpmnPanel: BpmnPanelLoader,
       loadPropertiesProvider : PropertiesProviderModuleLoader
      };


});
