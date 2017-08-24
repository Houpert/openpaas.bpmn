'use strict';

angular.module('esn.bpmn')
  .factory('userService', function($http, tokenAPI, fileAPIService) {

    var listFileUrl = '/bpmnJs/api/myfiles';
    var bpmnJsUrl = '/bpmnJs/api/';
    var apiFileUrl = '/api/files/';
    var apiUserUrl = '/api/user/';

    var selectFile = function(id) {
      return $http.get(apiFileUrl + id).then(function(response) {
        return response;
      });
    };

    var deleteFile = function(id) {
      $http.delete(bpmnJsUrl+'removebpmn/'+id).then(function(response) {
        return $http.delete(apiFileUrl + id).then(function(res) {
          return res;
        });
      });
    };

    var userInfo = function() {
      return $http.get(apiUserUrl).then(function(response) {
        return response.data;
      });
    };

    var writeFile = function(file) {
       var idFile = fileAPIService.uploadBlob(apiFileUrl, file, 'application/octet-stream', file.size, null, null).then(function(response) {
         saveBpmn(file.name, response.data._id)
         return response.data._id;
       });
    };

    var listBpmn = function() {
      return $http.get(bpmnJsUrl+'listbpmn').then(function(response) {
        return response;
      });
    };

    var saveBpmn = function(fileName, idFile) {
     return $http.post(bpmnJsUrl+'savebpmn', {
        fileName: fileName,
        bpmnFileId: idFile
      }).then(function(res){
        return res;
      },function(err){
        return err;
      }
     );
    };



    var getToken = function() {
      return tokenAPI.getNewToken().then(function(response) {
        return response.data;
      });
    };

    return {
      deleteFile:deleteFile,
      selectFile:selectFile,
      userInfo:userInfo,
      writeFile:writeFile,
      getToken:getToken,
      listBpmn:listBpmn,
      saveBpmn:saveBpmn
    };
  });
