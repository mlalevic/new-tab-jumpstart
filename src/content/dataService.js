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

//setup namespaces
var mlalevic;
if (!mlalevic) {
    mlalevic = {};
}


if (!mlalevic.JumpStart) {
  mlalevic.JumpStart = {};
}

if (!mlalevic.JumpStart.Data) {
  mlalevic.JumpStart.Data = {};
}
  
  
if (!mlalevic.JumpStart.Services) {
  mlalevic.JumpStart.Services = {};
}
//** end setup namespaces

//import browserServices - we are using browserServices to load data from files
//   we are using config and load data from database services too
Components.utils.import("resource://modules/browserServices.js", mlalevic.JumpStart.Services);
Components.utils.import("resource://modules/dbService.js", mlalevic.JumpStart.Services);
Components.utils.import("resource://modules/utils.js", mlalevic.JumpStart.Services);

//using (function(){...})(); construct so we won't polute our top level namespace
(function(){

var services = mlalevic.JumpStart.Services; //this is private variable. Shorthand for services

  mlalevic.JumpStart.Data.Service = function(/*browserService*/){
      //this.browserService = browserService;
  }

  mlalevic.JumpStart.Data.Service.prototype = {
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
  };
})();