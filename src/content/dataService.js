/* **** BEGIN LICENSE BLOCK *****
The contents of this file are subject to the Mozilla Public License
Version 1.1 (the "License"); you may not use this file except in
compliance with the License. You may obtain a copy of the License at
http://www.mozilla.org/MPL/

Software distributed under the License is distributed on an "AS IS"
basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
License for the specific language governing rights and limitations
under the License.

The Original Code is New Tab JumpStart.

The Initial Developer of the Original Code is Mihailo Lalevic.
Copyright (C) 2008, Mihailo Lalevic. All Rights Reserved.

Contributor(s): 
**** END LICENSE BLOCK **** */


//TODO: (ML) unit-testing

var mlalevic;
if(!mlalevic){mlalevic = {};}
if(!mlalevic.JumpStart){mlalevic.JumpStart = {};}
if(!mlalevic.JumpStart.Data){mlalevic.JumpStart.Data = {};}

(function(){
    var services = {}
    //import browserServices - we are using browserServices to load data from files
    //   we are using config and load data from database services too
    Components.utils.import("resource://modules/browserServices.js", services);
    Components.utils.import("resource://modules/dbService.js", services);
    Components.utils.import("resource://modules/utils.js", services);

    //create namespaces
    //var data = services.Namespace.get(window, "mlalevic.JumpStart.Data");
    var data = mlalevic.JumpStart.Data;

    data.Service = function(){

    }

    data.Service.prototype = {
        loaded : false,
        lastLoaded : null,
        thumbs : [],
        notAllowed: [],
        mappings : [],
        makeURI : function (aURL, aOriginCharset, aBaseURI) {
             var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                                        .getService(Components.interfaces.nsIIOService);
             return ioService.newURI(aURL, aOriginCharset, aBaseURI);
        },
        saveThumb : function(properties, thumbData){
            services.AnnoService.saveThumb(this.makeURI(properties.url), thumbData);
        },
        saveConfiguration : function(properties){
            var config = services.Converter.toJSONString(properties);
            services.AnnoService.saveProperties(this.makeURI(properties.url), config);
        },
        getThumbs : function(){
            return this.thumbs;
        }
    }

    /*data.App = {
        _key : "mlalevic.JumpStart.DataInitialized",
        isInitialized : function(){
            if (Application.storage.has(this._key)) {
              return Application.storage.get(this._key, null);
            }else{
                return false;
            }
        },

        setInitialized : function(){
            Application.storage.set(this._key, true);
        }
    }*/
})();