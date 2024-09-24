/**
 * Created by danielhindi on 8/19/16. https://github.com/petermetz/cordova-plugin-ibeacon
 */

function iBeaconRegion(uuid,identifier,minor,major){
    this.uuid = uuid;
    this.identifier = identifier;
    this.minor = minor;
    this.major = major;
}

var iBeacon = {
    _isIBeaconEnabled: function(){
        return cordova
            && cordova.plugins
            && cordova.plugins.locationManager
            && cordova.plugins.locationManager.BeaconRegion;
    }
    ,init:function(){
        if(!iBeacon._isIBeaconEnabled())return;
        iBeacon._setDelegate();
    }
    //,onNewWatchStarted:function(){}
    ,onRegionEntered:function(beacon){}
    ,onRegionExited:function(beacon){}
    ,_setDelegate:function(){
        var delegate = new cordova.plugins.locationManager.Delegate();

        /// started monitoring beacon region
        //delegate.didStartMonitoringForRegion = iBeacon.onNewWatchStarted;

        ///Triggers when a state changes or is requested
        delegate.didDetermineStateForRegion = function (beacon) {
            if (beacon) {
                if (beacon.state == "CLRegionStateInside")
                    iBeacon.onRegionEntered(beacon);
                else if (beacon.state == "CLRegionStateOutside")
                    iBeacon.onRegionExited(beacon);
                else
                    alert(JSON.stringify(beacon));
            }
        };

        cordova.plugins.locationManager.setDelegate(delegate);

    }
    , startBeaconWatch:function(beacon,callback) {
        callback=callback || function(){};

        if( !iBeacon._isIBeaconEnabled() ){
            var err= new Error("iBeacon is not enabled");
            console.error(err);
            callback(err);
            return;
        }

        /*
                delegate.didEnterRegion = function (pluginResult) {
                    pluginResult = pluginResult || {};
                    logToDom(">>> didEnterRegion: " + JSON.stringify(pluginResult));
                    var t = "" || localStorage.getItem('totalEntered');
                    t += "+";
                    localStorage.setItem('totalEntered', t);
                    logToDom("totalEntered: ", t);
                    UpdateTotals();
                    navigator.notification.beep();

                };

                delegate.didExitRegion = function (pluginResult) {
                    pluginResult = pluginResult || {};
                    logToDom("<<< didEnterRegion: " + JSON.stringify(pluginResult));
                    var t = "" || localStorage.getItem('totalExited');
                    t += "+";
                    localStorage.setItem('totalExited', t);
                    UpdateTotals();

                    logToDom("totalExited: ", t);
                    navigator.notification.beep();
                };


                delegate.didRangeBeaconsInRegion = function (pluginResult) {
                    logToDom('[DOM] didRangeBeaconsInRegion: ' + JSON.stringify(pluginResult));
                };
         */
        /*
        var uuid = 'B9407F30-F5F8-466E-AFF9-25556B57FE6D';
        var identifier = 'bfBeacon';
        var minor;//= 34751;
        var major;//= 807;
        */

        var beaconRegion;

        try {
            beaconRegion = new cordova.plugins.locationManager.BeaconRegion(beacon.identifier, beacon.uuid, beacon.major, beacon.minor);
        }
        catch (e) {
            console.error("startBeaconWatch",e);
            callback(e);
            return;
        }

        /// ask for permission, required in iOS 8+
        //cordova.plugins.locationManager.requestWhenInUseAuthorization();
        cordova.plugins.locationManager.requestAlwaysAuthorization();

        console.log("startMonitoringForRegion");
        cordova.plugins.locationManager.startMonitoringForRegion(beaconRegion)
            .fail(callback)
            .done(function(){callback()});
    }
    , stopBeaconWatch:function(beacon,callback) {
        callback=callback || function(){};

        if( !iBeacon._isIBeaconEnabled() ){
            var err= new Error("iBeacon is not enabled");
            console.error(err);
            if(callback)callback(err);
            return;
        }

        if(!beacon)return;

        var beaconRegion = new cordova.plugins.locationManager.BeaconRegion(beacon.identifier, beacon.uuid, beacon.major, beacon.minor);


        cordova.plugins.locationManager.stopRangingBeaconsInRegion(beaconRegion)
            .fail(function(err){
                console.error("iBeacon::stopRangingBeaconsInRegion Error",err);
                if(callback)callback(err);
            })
            .done(function(){
                if(callback)callback();
            });
    }


};

document.addEventListener("deviceready", iBeacon.init, false);
