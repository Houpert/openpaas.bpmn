'use strict';

angular.module('esn.home')
  .controller('homeController', function($scope, userService, notificationFactory) {

    $scope.titleDashboard = 'DashBoard';
    $scope.summaryTitle = 'Summary';
    $scope.networkTitle = 'Network > Company';  //TODO Company need to be get from somewhere ? (to define with partenair)

    var accesEmail = 'yoann@open-paas.org';

    function summaryListGenerator() {
      return ['Notification', 'Execution', 'BPMN Added'];
    }

    function moduleLinkGenerator(acces) {
      return [
          {
          key: 'General',
          list: [
              {
              value: 'Network',
              link: 'http',
              acces: acces
            },
            {
              value: 'Company',
              link: 'http',
              acces: acces
            },
            {
              value: 'Users',
              link: 'http',
              acces: acces
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
              acces: acces
            },
            {
              value: 'Mapping Rules',
              link: 'http',
              acces: acces
            },
            {
              value: 'Events',
              link: 'http',
              acces: acces
            }
          ]
        },
        {
          key: 'Resources',
          list: [
            {
              value: 'Hubs',
              link: 'http',
              acces: acces
            },
            {
              value: 'Legacy Systems',
              link: 'http',
              acces: acces
            },
            {
              value: 'IoT Devices',
              link: 'http',
              acces: acces
            }
          ]
        },
        {
          key: 'Plans',
          list: [
            {
              value: 'Definition',
              link: 'http',
              acces: acces
            },
            {
              value: 'Execution',
              link: 'http',
              acces: acces
            },
            {
              value: 'Opt. Algorithms',
              link: 'http',
              acces: acces
            }
          ]
        },
        {
          key: 'Monitoring',
          list: [
            {
              value: 'Events',
              link: 'http',
              acces: acces
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
      $scope.moduleLinkGenerator = moduleLinkGenerator(true); //TODO Make a web service for generating the user homePage (to define with partenair)

      /* Keep for the next demo
      if(acces){
        $scope.moduleLinkGenerator.splice(2,3);
      }else{
        $scope.moduleLinkGenerator.splice(0,2);
      }*/
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
