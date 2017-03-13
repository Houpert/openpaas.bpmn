'use strict';

angular.module('esn.home')
  .controller('homeController', function($scope, userService, notificationFactory) {

    var accesEmail = 'yoann@open-paas.org';

    function summaryListGenerator() {
      return ['Notification', 'Execution', 'BPMN Added'];
    }

    function moduleLinkGenerator(isDemo, acces) {
      return [
          {
          key: 'General',
          list: [
              {
              value: 'Network',
              link: 'http',
              acces: isDemo
            },
            {
              value: 'Company',
              link: 'http',
              acces: isDemo
            },
            {
              value: 'Users',
              link: 'http',
              acces: isDemo
            },
            {
              value: 'Workflow',
              link: '#/bpmn',
              acces: acces
            }
          ]
        },
        {
          key: 'Data',
          list: [
            {
              value: 'DataSets',
              link: 'http',
              acces: isDemo
            },
            {
              value: 'Mapping Rules',
              link: 'http',
              acces: isDemo
            },
            {
              value: 'Events',
              link: 'http',
              acces: isDemo
            }
          ]
        },
        {
          key: 'Resources',
          list: [
            {
              value: 'Hubs',
              link: 'http',
              acces: isDemo
            },
            {
              value: 'Legacy Systems',
              link: 'http',
              acces: isDemo
            },
            {
              value: 'IoT Devices',
              link: 'http',
              acces: isDemo
            }
          ]
        },
        {
          key: 'Plans',
          list: [
            {
              value: 'Definition',
              link: 'http',
              acces: isDemo
            },
            {
              value: 'Execution',
              link: 'http',
              acces: isDemo
            },
            {
              value: 'Opt. Algorithms',
              link: 'http',
              acces: isDemo
            }
          ]
        },
        {
          key: 'Monitoring',
          list: [
            {
              value: 'Events',
              link: 'http',
              acces: isDemo
            }
          ]
        }
      ];
    }

    function isAcces(email) {
      return (accesEmail === email);
    }

    function initView(email) {
      var acces = isAcces(email);

      $scope.summaryList = summaryListGenerator();
      $scope.moduleLinkGenerator = moduleLinkGenerator(true, true);

      if(acces){
        $scope.moduleLinkGenerator.splice(2,3);
      }else{
        $scope.moduleLinkGenerator.splice(0,2);
      }
    }

    function userInfo() {
      return userService.userInfo().then(function(result) {
        $scope.userInfo = result;
        initView($scope.userInfo.preferredEmail);
        return result;
      }, function(err) {
        notificationFactory.weakError('Error', err);
      });
    }
    $scope.userInfo = userInfo();
  });
