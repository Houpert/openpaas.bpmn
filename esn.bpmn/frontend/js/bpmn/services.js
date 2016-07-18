'use strict';

//TODO Remove when list file is done
//578cd3e560d489273bd87af1 (empty)
//578cd27b60d489273bd87aef (empty)
//578cf783ed38236e5dbaf3a7 (with 2 node)
//578d0024ed38236e5dbaf3a9 (condition node)
//578d011498316a86696abd51 (pizza diagram)

angular.module('esn.bpmn')
  .factory('bpmnService', function($http, fileUploadService) {
    //TODO manage return file list server
    var listFile = function() {
      return $http.get('/api/files').then(function(response) {
        return response;
      });
    };

    var selectFile = function(id) {
        return $http.get('/api/files/'+id).then(function(response) {
          return response;
        })
    };

    var writeFile = function(file) {
      fileUploadService.get().addFile(file, true);
    };

    return {
      listFile : listFile,
      writeFile : writeFile,
      selectFile : selectFile
    };
  });
