'use strict';
/**
 * Created by Daniel on 9/10/2015.
 */

var contentManager = {
        debugMode: false,
        appHasUpdated: false,
        total: 0,
        value: 0,
        startedAt:null,
        offlineMode:null,
        //promptedUser: false,  //TO DO TAKE THIS OUT?
        setProgress: function (value, total) {
            if (value) contentManager.value = value;
            if (total) contentManager.total = total;
            var percent = Math.round((contentManager.value * 1.0 / contentManager.total * 1.0) * 100);
            this.onProgressUpdate(percent)
        },
        onProgressUpdate: function (percent) {
        },
        onSubProgressUpdate: function (percent) {
        },
        onStatusUpdate:function(status){

        },
        checkForUpdate: function (options = {}, callback) {
            if (!appConfig) {
                console.error('App Config is undefined');
                return;
            }

            if (!appConfig.appId) {
                alert('No App ID provided');
                return;
            }

            contentManager.onStatusUpdate("Checking for updates");

            var forceUpdate = (appConfig.forceUpdate || appConfig.askOfflineMode);

            if(forceUpdate && navigator.splashscreen){
                // if these options are on people want to see whats going on
                navigator.splashscreen.hide();
            }

            if (appConfig.forceUpdate || appConfig.askOfflineMode) {
                contentManager.clearLocalManifest();
                /// if these options are on people want to see whats going on
                if(navigator.splashscreen)navigator.splashscreen.hide();
            }

            console.log('check if forceUpdate');
            this.setProgress(0, 2);
            this.startedAt=Date.now();

            var currentAppManifest;
            try {
                currentAppManifest = localStorage.getItem('currentAppManifest');
                if(currentAppManifest)
                    currentAppManifest = JSON.parse(currentAppManifest);
                else
                    currentAppManifest = null;
            }
            catch (e) {
                contentManager.clearLocalManifest();
            }

            const performanceLog = options.performanceLog || {};

            const connectionType = (navigator && navigator.network && navigator.network.connection && navigator.network.connection.type)
                ? navigator.network.connection.type
                : 'unknown';

            if ((connectionType == Connection.NONE) && currentAppManifest) return callback();

            performanceLog.connectionType = connectionType;

            contentManager.fetchManifest(function (appManifest, manifestResponseTime) {
                performanceLog.manifestResponseTime = manifestResponseTime;

                if (manifestResponseTime >= 2e3 && typeof atatus != 'undefined') {
                    atatus.notify(new Error('Manifest response time is too high'), { manifestResponseTime });
                }

                //We have the new manifest, so it's ok to clear out the old one out
                if (forceUpdate) {
                    contentManager.clearLocalManifest();
                }

                contentManager.setProgress(1, 2);
                contentManager.processManifest(currentAppManifest,appManifest, function({ downloadedComponents, manifestUpdateStart, manifestUpdateFinish }) {
                    performanceLog.manifestComponentsDownloaded = downloadedComponents;
                    performanceLog.manifestUpdateStart = manifestUpdateStart;
                    performanceLog.manifestUpdateFinish = manifestUpdateFinish;
                    contentManager.writeNomedia(function(err) {
                        console.log(err);
                    });
                    callback();
                }, function (err) {
                    console.error(err);
                    callback();
                });
            }, function (err) {
                console.error(err);

                if(currentAppManifest){
                    callback(); //just use what you have for now
                    return;
                }
                else {
                    if (navigator && navigator.splashscreen)
                        navigator.splashscreen.hide();

                    var alertMessage = "It looks like the app has problems connecting to the internet. Click [Try again] when a stable connection is established.";
                    if(err && typeof err === 'string'){
                        alertMessage = alertMessage + ' (details: ' + err.substring(0, 19) + ')';
                    }

                    if(navigator && navigator.notification){
                        navigator.notification.alert(alertMessage, null, "Try Again");
                    }
                    else{
                        alert(alertMessage);
                    }

                    if(navigator && navigator.app)
                        navigator.app.exitApp();
                }
            });

        },

        writeNomedia: function(fail) {
            contentManager.getFilesystem(function (fileSystem) {
                fileSystem.root.getFile('app/.nomedia', {create: true, exclusive: true}, function(fileEntry) {
                    fileEntry.createWriter(function (fileWriter) {

                        fileWriter.onwriteend = function (e) {
                            console.log('Write completed.');
                        };

                        fileWriter.onerror = function (e) {
                            console.log('Write failed: ' + e.toString());
                        };

                        // Create a new Blob and write it to no media.
                        var blob = new Blob(['Lorem Ipsum'], {type: 'text/plain'});

                        fileWriter.write(blob);

                    }, function () {
                        console.log("Could not create writer.");
                    });
                }, fail);
                fileSystem.root.getFile('pluginTemplate/.nomedia', {create: true, exclusive: true}, function(fileEntry) {
                    fileEntry.createWriter(function (fileWriter) {

                        fileWriter.onwriteend = function (e) {
                            console.log('Write completed.');
                        };

                        fileWriter.onerror = function (e) {
                            console.log('Write failed: ' + e.toString());
                        };

                        // Create a new Blob and write it to no media.
                        var blob = new Blob(['Lorem Ipsum'], {type: 'text/plain'});

                        fileWriter.write(blob);

                    }, function () {
                        console.log("Could not create writer.");
                    });
                }, fail);
                fileSystem.root.getFile('imageLib/.nomedia', {create: true, exclusive: true}, function(fileEntry) {
                    fileEntry.createWriter(function (fileWriter) {

                        fileWriter.onwriteend = function (e) {
                            console.log('Write completed.');
                        };

                        fileWriter.onerror = function (e) {
                            console.log('Write failed: ' + e.toString());
                        };

                        // Create a new Blob and write it to no media.
                        var blob = new Blob(['Lorem Ipsum'], {type: 'text/plain'});

                        fileWriter.write(blob);

                    }, function () {
                        console.log("Could not create writer.");
                    });
                }, fail);
            }, fail);
        },

        fetchManifest: function (success, fail) {
            var url = appConfig.endPoints.updateServer + '/api/app/' + appConfig.appId + '/manifest?cacheBuster=' + new Date().getTime();
            console.log('fetchManifest:: try to download ' + url);
            const startedAt = Date.now();

            this.httpGET(url, function (data) {
                //If the HTTP call timed out, data will be an empty string
                if(data == ''){
                    fail('Call to app manifest API resulted in no data returned. Possible timeout.');
                    return;
                }
                
                const responseTime = Date.now() - startedAt;

                var appManifest;
                try {
                    appManifest = JSON.parse(data);
                }
                catch (e) {
                    fail('failed to parse manifest.' + e);
                }

                //cleanup old zip files
                if (appManifest)
                    success(appManifest, responseTime);
                else
                    fail();

            }, fail);
        },

        clearLocalManifest: function () {
            localStorage.removeItem('currentAppManifest');
            localStorage.removeItem('askedUserOffline');
        },

        download: function (uri, folderName, fileName, progress, success, fail) {
            contentManager.getFolder(folderName, function (folder) {
                var filePath = folder.toURL() + "/" + fileName;
                console.log('download: ' + uri);
                contentManager.transferFile(uri, filePath, progress, success, fail);
            }, function (error) {
                console.log("Failed to get folder: " + error.code);
                typeof fail === 'function' && fail("Failed to get folder: " + JSON.stringify(error));
            });
        },

        getFilesystem: function (success, fail) {
            if(window.fileSystem && success) {
                success(window.fileSystem);
                return;
            }

            function cacheAndReport (fileSystem) {
                window.fileSystem = fileSystem;
                if(success)
                    success(fileSystem);
            }

            window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

            if (typeof(LocalFileSystem) != "undefined" && LocalFileSystem.PERSISTENT)
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, cacheAndReport, fail);
            else
                window.requestFileSystem(window.PERSISTENT, 0, cacheAndReport, fail);
        },

        getFolder: function (folderName, success, fail) {
            console.log('Get Folder ' + folderName);
            contentManager.getFilesystem(
                function (fileSystem) {

                    var folders = folderName.split('/');

                    var getNextFolder = function (folderEntry) {
                        var f = folders.shift();
                        console.log('>> Get/Create folder ' + f);
                        folderEntry.getDirectory(f, {create: true, exclusive: false}, function (folderEntry) {
                            console.log('<< ' + f);
                            if (folders.length == 0)
                                success(folderEntry);
                            else
                                getNextFolder(folderEntry);
                        }, fail);
                    };

                    fileSystem.root.getDirectory(folders.shift(), {
                        create: true,
                        exclusive: false
                    }, function (folderEntry) {
                        folderEntry.setMetadata(function () {
                                console.log('set meta data success');
                            }, function () {
                                console.log('set meta data failed');
                            },
                            {"com.apple.MobileBackup": 1});
                        if (folders.length == 0)
                            success(folderEntry);
                        else
                            getNextFolder(folderEntry);
                    }, fail);
                }
                , fail);
        },

        transferFile: function (uri, filePath, progress, success, fail) {
            if (typeof(FileTransfer) == "undefined") {
                alert("FileTransfer is not defined, please install it manually.");
                fail("FileTransfer is undefined");
                return;
            }

            var transfer = new FileTransfer();
            transfer.onprogress = function (progressEvent) {
                if (progressEvent.lengthComputable) {
                    var perc = Math.floor(progressEvent.loaded / progressEvent.total * 100);
                    typeof progress === 'function' && progress(perc); // progression on scale 0..100 (percentage) as number
                } else {
                }
            };

            transfer.download(
                uri,
                filePath,
                function (entry) {
                    console.log("File saved to: " + entry.toURL());
                    typeof success === 'function' && success(filePath);
                },
                function (error) {
                    console.error("Error downloading " + uri);
                    console.error("An error has occurred: Code = " + error.code);
                    console.error("download error source " + error.source);
                    console.error("download error target " + error.target);
                    console.error("download error code " + error.code);
                    typeof fail === 'function' && fail(error);
                }
            );
        },


        /**
         * Perform AJAX GET on the provided URL.
         *
         * @param url The request URL
         * @private
         */
        httpGET: function (url, success, fail) {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.timeout = 5000;
            xmlhttp.open("GET", encodeURI(url));

            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4)
                    success(xmlhttp.responseText);
            };

            xmlhttp.onerror = fail;
            xmlhttp.send();

        },
        processManifest: function (currentAppManifest,appManifest, success, fail) {
            console.log('processManifest');

            contentManager.offlineMode = appConfig.askOfflineMode || appManifest.offlineModeEnabled;

            console.log('processManifest: check master version', appManifest);
            if (!currentAppManifest
                || appManifest.forceUpdate
                || appManifest.askOfflineMode
                || appManifest.version != currentAppManifest.version
            )
                currentAppManifest = {app: null, components: []};

            console.log('processManifest: check master version done!!!');
            var  pendingUpdateCount, componentQueue = [];
            var appManifestLength = (appManifest.components && appManifest.components.length) ?
                appManifest.components.length : 0;
            pendingUpdateCount = appManifestLength;

            contentManager.total += pendingUpdateCount;
            contentManager.setProgress();

            const downloadedComponents = [];
                        const manifestUpdateStart = Date.now();

            var cbHandler = function (err, downloadedComponent) {

                pendingUpdateCount--;
                contentManager.setProgress(++contentManager.value);
                
                if (err) console.warn(JSON.stringify(err)); // continue

                else if (downloadedComponent && downloadedComponent.Id) {
                    downloadedComponents.push(downloadedComponent);
                }

                if (pendingUpdateCount == 0) {
                    appManifest.forceUpdate = false; // just in case so it doesnt do it every time it loads
                    localStorage.setItem('currentAppManifest', JSON.stringify(appManifest));
                    success({ downloadedComponents, manifestUpdateStart, manifestUpdateFinish: Date.now() });
                }

            };

            var failSafe = function () {
                if (pendingUpdateCount > 0) {
                    console.error(pendingUpdateCount + ' pending updates taking too long. ' + JSON.stringify(componentQueue));
                    fail(pendingUpdateCount + ' pending updates taking too long. ');
                }
            };


            var createTask = function (oldComponents, newComponents) {
                var removeComponent = function (url) {
                    for (var i = 0; i < componentQueue.length; i++) {
                        if (componentQueue[i] == url) {
                            componentQueue.splice(i, 1);
                            break;
                        }
                    }
                };

                return function () {

                    /// download updates in parallel or serial
                    var PARALLEL_MODE=true;

                    const onComplete = result => {
                        console.log("FINISHED MANIFEST ENTRIES");
                        removeComponent(newComponents.url);
                        cbHandler(null, result);
                        if(!PARALLEL_MODE) processQ();
                    };
                    const onError = err => {
                        console.error(err, newComponents);
                        removeComponent(newComponents.url);
                        if(!newComponents.optional && newComponents.Id != "dataDump" && newComponents.Id != "appTheme") {
                            /// exclude datadump because nto all have compiled yet and there is a fall back same fro appTheme

                            var alertMessage = 'There was an issue opening the app. Please try again.';
                            //'A critical component has failed to update. ID: ' + newComponents.Id + " version: " + newComponents.version;

                            if(err && typeof err === 'string'){
                                alertMessage = alertMessage + ' (details: ' + err.substring(0, 19) + ')';
                            }

                            if(navigator && navigator.notification){
                                navigator.notification.alert(alertMessage, null, "Try Again");
                            }
                            else{
                                alert(alertMessage);
                            }
                        }
                        cbHandler(err);
                        if(!PARALLEL_MODE)processQ();
                    };

                    contentManager._compareAndDownloadManifestEntries(oldComponents, newComponents, onComplete, onError);

                    if(PARALLEL_MODE)processQ();
                };
            };

            /// queue of functions to run one at a time
            var execQ = [];

            for (const component of appManifest.components) {
                var foundMatch = false;
                componentQueue.push(component);

                for (const currentComponent of currentAppManifest.components) {
                    if (component.Id == currentComponent.Id) {
                        execQ.push(createTask(currentComponent, component));
                        foundMatch = true;
                        break;
                    }
                }

                if (!foundMatch) execQ.push(createTask(null, component));
            }

            var processQ = function () {
                console.log('execQ size ' + execQ.length);
                if (execQ.length)
                    execQ.splice(0, 1)[0](); //run and remove from Q
            };
            processQ();

        },
        promptUserOffline: function(callback) {

            //When the user clicks on the offlineCancel button, close the progress box and continue to app.
            offlineCancel.onclick = function() {
                offlineChoice.style.display = "none";
                callback( null,false);
            };

            // When the user clicks on offlineNo button, close the offlineChoice modal and record response
            offlineNo.onclick = function() {
                offlineChoice.style.display = "none";
                callback(null,false);
            };

            // When the user clicks on offlineYes button, close the offlineChoice modal and record response
            offlineYes.onclick = function() {
                offlineChoice.style.display = "none";
                downloadContent.style.display = "block";
                callback(null,true);
            };

            //TO DO Is this necessary?
            if (navigator && navigator.splashscreen)
                navigator.splashscreen.hide();

            //TO DO CALL BACK YES IF NOTHING IN MANIFEST
            //does the manifest have offline mode set?
            if (contentManager.offlineMode) {
                //has the user ever said to use app in offline mode?
                if (!window.localStorage.getItem('askedUserOffline')) {
                    //no user has not been prompted.
                    offlineChoice.style.display = "block";
                    downloadContent.style.display = "none";
                    fluffContainer.style.display = "none";
                    window.localStorage.setItem('askedUserOffline', true);
                } else {
                    callback(null,true);
                }
            } else {
                callback(null,false);
            }


        },
        processFile: function({ Id, name, url, version, unzipPath }, success, fail) {
            let fileName = Id + '';
            fileName = fileName.replace(' ', '');
            fileName = fileName.replace('.', '_');
            fileName += '.zip';

            if (name == 'app') contentManager.appHasUpdated = true;

            let downloadUrl = url + (url.indexOf('?') >= 0 ? "&" : "?") + `v=${version}`;
            downloadUrl = downloadUrl.replace("https:/", "http:/");

            contentManager.onStatusUpdate(`Downloading ${name}...`);

            const downloadStartedAt = Date.now();

            const onDownloadError = err => {
                console.error(`failed to download ${downloadUrl}`, err);
                if (fail) fail(`failed to download ${downloadUrl}`);
            };
            const onDownloadProgressUpdate = percent => contentManager.onSubProgressUpdate(percent, `downloading ${name}`);

            const onDownloadComplete = filePath => {
                const downloadFinishedAt = Date.now();

                const onUnzipProgressUpdate = progressEvent => {
                    const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                    contentManager.onSubProgressUpdate(percent, `unzip ${fileName}`);
                };

                const onUnzipComplete = () => {
                    const data = {
                        Id, name, url, version, unzipPath,
                        downloadStartedAt, downloadFinishedAt,
                        unzipFinishedAt: Date.now()
                    };
                    success(data);
                };

                const onUnzipError = err => {
                    console.error(`failed to unzip ${filePath}`, err);
                    if (fail) fail(`failed to unzip ${filePath}`);
                };

                contentManager.unzip(unzipPath, filePath, onUnzipProgressUpdate, onUnzipComplete, onUnzipError);
            };

            contentManager.download(downloadUrl, 'zip', fileName, onDownloadProgressUpdate, onDownloadComplete, onDownloadError);
        },
        _compareAndDownloadManifestEntries: function (localEntry, remoteEntry, success, fail) {
            console.log('compareAndDownloadManifestEntries', localEntry, remoteEntry);

            const { optional, url } = remoteEntry;

            const requiresUpdate = typeof(localEntry) == "undefined" || localEntry == null || (localEntry.version != remoteEntry.version);
            const askOffline = optional && (appConfig.askOfflineMode || Date.now() - contentManager.startedAt > 5000);

            if (!requiresUpdate) {
                console.log(`compareAndDownloadManifestEntries: skip download of ${url} localEntry.version=${localEntry.version} remoteEntry.version=${remoteEntry.version}`);
                return success();
            }

            if (askOffline) return contentManager.promptUserOffline(function(err, downloadAllContent) {
                if (err) return fail(err);

                if (downloadAllContent) return contentManager.processFile(remoteEntry, success, fail);

                // if its optional and i've already spent too much time. let them download the rest next login
                console.log(`Skip optional update, ${remoteEntry.Id}`);
                remoteEntry.version = null; ///this way next time it looks like you dont have the right version
                return success(); // act like you downloaded it and move on
            });
            
            contentManager.processFile(remoteEntry, success, fail);
        },
        unzip: function (unzipFolder, zipFile, progress, success, fail) {
            //var unzipPath = "cdvfile://localhost/persistent/" + folderName;
            contentManager.getFolder(unzipFolder, function (folderEntry) {
                if (folderEntry.toURL().indexOf(unzipFolder) === -1) {
                    var finalUnzipFolder = folderEntry.toURL() + unzipFolder;
                } else {
                    var finalUnzipFolder = folderEntry.toURL();
                }
                console.log("<hr/>Unzip:<br/>" + zipFile + "<br/> to <br/>" + finalUnzipFolder + "<hr/>");
                zip.unzip(zipFile,
                    finalUnzipFolder,
                    function (result) {
                        if (result == 0) {
                            console.log("<hr/>Success - Unzip:<br/>" + zipFile + "<br/> to <br/>" + folderEntry.toURL() + "<hr/>")
                            success();
                        } else {
                            console.error('Error unzipping ' + zipFile + ' to ' + unzipFolder);
                            fail('Error unzipping ' + zipFile);
                        }
                    },
                    progress
                );
            }, function (err) {
                console.error("<h2>Unzip failed to get folder " + unzipFolder + " error: " + JSON.stringify(err) + "</h2>");
                fail(err);
            });

        }
    }
;
