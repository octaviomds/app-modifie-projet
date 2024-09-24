'use strict';

var environmentConfigs = {
    'int': {
        updateServer: 'http://int2.myapp.buildfire.com'
    },
    'dev': {
        updateServer: 'http://dev.kaleo.com'
    },
    'uat': {
        updateServer: 'http://uat-app.buildfire.com'
    },
    'prod': {
        updateServer: 'http://app.buildfire.com'
    }
};

var appConfig = {
    appId: null
    , _env: 'prod'
    , set env(env) {
        this._env = env;

        this.endPoints = environmentConfigs[this._env];

        if(this._env == 'prod'){
            this.endPoints.updateServer = this.endPoints.updateServer.replace('http:', 'https:')
        }

        if (!this.endPoints) {
            this._env = 'uat';
            this.endPoints = environmentConfigs[this._env];
        }
        this.save();
    }
    , get env() {
        return this._env;
    }
    , mode: 0
    , lastUrl: null
    , forceUpdate: false
    , extras: []
    , localStoragePath: (localStorage.getItem('fsPath') || '/') + '/softBundle/'
    , compileQueryString: function () {
        // Build core URL parameters
        let url = `?appId=${this.appId}&env=${this.env}&mode=${this.mode}`;

        // Append last URL. Used to return to source app, if previewing another
        if (this.lastUrl) url += `&lastUrl=${encodeURIComponent(this.lastUrl)}`;

        // Build any extra parameters
        try {
            (this.extras || []).forEach(({ name, value }) => {
                url += `&${name}=${encodeURIComponent(value)}`;
            });
        } catch (error) {
            console.error('Failed to load bundle extras!', error, this.extras);
        }
        
        return url;
    }
    , save: function () {
        localStorage.setItem("appConfig", JSON.stringify(this));
    }
    , load: function () {
        var obj = localStorage.getItem("appConfig");
        if (obj) {
            try {
                obj = JSON.parse(obj);
                if (obj.appId)this.appId = obj.appId;
                if (obj.env)this.env = obj.env;
                if (obj.mode)this.mode = obj.mode;
                if (obj.extras)this.extras = obj.extras;

            }
            catch (e) {
                console.error(e);
            }
        }

        var getParameterByName = function (name) {
            name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(location.search);
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        };

        // Returns an array of all query parameters
        let queryParameters = location.search.match(/\&[a-z]{1,}\=|\?[a-z]{1,}\=/gi);
        
        queryParameters.forEach(param => {

            // remove prefix and suffix
            let name = param.substring(1, param.length -1);

            const value = getParameterByName(name);
            
            switch (name) {
                case 'appId': {
                    if (value) appConfig.appId = value;
                    break;
                }
                case 'mode': {
                    if (value == '1') appConfig.mode = 1;
                    else if (value == '0') appConfig.mode = 0;
                    break;
                }
                case 'env': {
                    appConfig.env = value || this._env;
                    break;
                }
                case 'forceUpdate': {
                    if (value) appConfig.forceUpdate = true;
                    break;
                }
                case 'askOfflineMode': {
                    if (value == "true") appConfig.askOfflineMode = true;
                    break;
                }
                case 'lastUrl': {
                    if (value) appConfig.lastUrl = value;
                    break;
                }
                default: {
                    if (value) {
                        try {
                            // clear out old extras
                            appConfig.extras = appConfig.extras.filter(extra => extra.name !== name);
                            appConfig.extras.push({ name, value });
                        } catch (error) {
                            console.error('Failed to load extras!', error);
                        }
                    }
                    break;
                }
            }
        });
        this.save();

    }

};

appConfig.load();
