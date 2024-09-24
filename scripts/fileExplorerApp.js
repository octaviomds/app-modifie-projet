/**
 * Created by Daniel on 9/28/2015.
 */
var app = angular.module('buildfire',[]);


app.controller('mainCtrl',['$scope',function($scope){

    function bind (entries) {
        $scope.timeStamp = new Date().toLocaleTimeString();
        $scope.entries = entries;
        if(!$scope.$$phase)
            $scope.$apply();

    }

    function fetch(entry) {
        $scope.parent = entry;
        fileExplorer.getFolderContent(entry, bind, function (err) {
            console.error('Error getting root ' ,err)
        });

        //bind([{name:"f1"},{name:"f2",isDirectory:true}]);

    }

    function nav(entry) {
        window.location = entry.toURL();
    }

    $scope.fetchWWW = function (){
        console.log(cordova.file.applicationDirectory);

        window.resolveLocalFileSystemURL(cordova.file.applicationDirectory , function(entry){
            $scope.parent = entry;
            fileExplorer.getFolderContent(entry, bind, function (err) {
                console.error('Error getting www2 ' ,err)
            });
        }, function (err) {
            console.error('Error getting www ' ,err)
        });
    };

    $scope.fetch = fetch;

    if(!deviceReady)
        setTimeout(fetch,1000);
    else
        fetch();
}]);