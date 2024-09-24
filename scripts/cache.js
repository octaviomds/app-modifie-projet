'user strict';

/**
 * Created by danielhindi on 1/14/16.
 * cache singleton to use webSQL when can and fall back to local storage
 */


var cache = {
    db:null
    ,init:function(){
        if(openDatabase) {
            this.db = openDatabase('myCache', '1.0', 'When Local Storage fails', 1 * 1024 * 1024);
            this.db.transaction(function (t) {
                t.executeSql('CREATE TABLE IF NOT EXISTS CACHE (key unique, value)');
            });
        }
    }
    ,setItem: function(key,value,callback){
        if(typeof (value) == "object")value = JSON.stringify(value);

        if(this.db){
            this.db.transaction(function(t){
                t.executeSql('INSERT into CACHE (key,value) values  (?,?)',[key,value],function(t,result){
                    if(callback)
                        callback(null, value);

                },function(t,err){
                    if(err.message.indexOf("UNIQUE"))
                        cache.updateItem(key,value,callback);
                    else if(callback)
                        callback(err);
                });

            });
        }
        else {
            localStorage.setItem(key,value);
            if(callback)callback(null,value);
        }
    }
    ,updateItem:function(key,value,callback){
        if(typeof (value) == "object")value = JSON.stringify(value);

        if(this.db){
            this.db.transaction(function(t){
                t.executeSql('update CACHE set value = ? where key = ?',[value,key],function(t,result){
                    if(callback)
                        callback(null, value);

                },function(t,err){
                    if(callback)
                        callback(err);
                });

            });
        }
        else {
            localStorage.setItem(key,value);
            if(callback)callback(null,value);
        }
    }
    ,getItem: function(key, callback){

        if(this.db){
            this.db.transaction(function(t){
                t.executeSql('Select * from CACHE where key = ?',[key]
                    ,function(t,result){  callback(null, result.rows.item(0).value);    }
                    ,function(t,err){  callback(err);   });

            });
        }
        else {
            callback(null,localStorage.getItem(key));
        }
    }
    ,getObject: function(key, callback){
        cache.getItem(key,function(err,data){
            if(err)
                callback(err);
            else {
                try{
                    callback(null,JSON.parse(data));
                }
                catch(e){
                    callback(e);
                }
            }
        })
    }
    , removeItem: function(key, callback){

        if(this.db){
            this.db.transaction(function(t){
                t.executeSql('delete from CACHE where key = ?',[key]
                    , function(){ callback();}
                    , function(t,err){ callback(err); });

            });
        }
        else {
            localStorage.removeItem(key);
            if(callback) callback(null,null);
        }
    }
};

cache.init();