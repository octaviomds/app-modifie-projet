'use strict';
/**
 * Created by Daniel on 9/28/2015.
 */



var fileExplorer = {
    getFolderContent: function (folderEntry, success, fail) {
        console.log('======getFolderContent======');
        if (!folderEntry) {
            fileExplorer.getFolder('', function(folder){
                fileExplorer.getFolderContent(folder,success,fail);
            }, function () {
                console.error('getFolderContent:: cant get root');
                fail();
            });
        }
        else {
            var rdr = folderEntry.createReader();
            rdr.readEntries(success, fail);
        }
    },
    recursive: function (folderEntry) {
        console.log('======recursive======');
        if (!folderEntry) {
            fileExplorer.getFolder('', fileExplorer.recursive, function () {
                console.error('recursive:: cant get root');
            });
        }
        else {
            var rdr = folderEntry.createReader();
            rdr.readEntries(function (entries) {
                for (var i = 0; i < entries.length; i++) {
                    console.log(entries[i].name);
                    if (entries[i].isDirectory) {
                        folderEntry.getDirectory(entries[i].name, {
                            create: false,
                            exclusive: false
                        }, fileExplorer.recursive, function () {
                            console.error('recursive:: cant get folder ' + entries[i].name);
                        });
                    }
                }
            }, function () {
                console.error('recursive:: failed to read entry for ' + folderEntry.toURL());
            });


        }
    }
    , download: function (uri, folderName, fileName, progress, success, fail) {
        fileExplorer.getFolder(folderName, function (folder) {
            var filePath = folder.toURL() + "/" + fileName;
            console.log('download: ' + uri);
            fileExplorer.transferFile(uri, filePath, progress, success, fail);
        }, function (error) {
            console.log("Failed to get folder: " + error.code);
            typeof fail === 'function' && fail("Failed to get folder: " + JSON.stringify(error));
        });
    },

    getFilesystem: function (success, fail) {
        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
        if (typeof(LocalFileSystem) != "undefined" && LocalFileSystem.PERSISTENT)
            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, success, fail);
        else
            window.requestFileSystem(window.PERSISTENT, 0, success, fail);
    },

    getFolder: function (folderName, success, fail) {
        console.log('Get Folder ' + folderName);
        fileExplorer.getFilesystem(
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

                fileSystem.root.getDirectory(folders.shift(), {create: true, exclusive: false}, function (folderEntry) {
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
        xmlhttp.open("GET", encodeURI(url));

        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4)
                success(xmlhttp.responseText);
        };

        xmlhttp.onerror = fail;
        xmlhttp.send();

    }


};