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


let EXPORTED_SYMBOLS = ["PlacesDb", "AnnoService"];

Components.utils.import("resource://modules/utils.js");


let PlacesDb = {
  executeQuery : function(aStatement, aBinder){
      var result = [];
      var statement = PlacesDb._prepareStatement(aStatement);
      try {
        while (statement.executeStep()) {
          result.push(aBinder(statement));
        }
      } finally {
        statement.reset();
      }
      return result;
  },
  
  _prepareStatement : function(aQuery){
      var file = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
      file.append("places.sqlite");

      var storageService = Components.classes["@mozilla.org/storage/service;1"]
                        .getService(Components.interfaces.mozIStorageService);
      var mDBConn = storageService.openDatabase(file);

      return mDBConn.createStatement(aQuery);
  }
};

let anno = Components.classes["@mozilla.org/browser/annotation-service;1"]
                                  .getService(Components.interfaces.nsIAnnotationService);

let AnnoService = {
    annoService: anno,
    thumbsAnno: "jumpstart/thumbs",
    propertiesAnno: "jumpstart/properties",
    header: "data:image/png;base64,",
    decode : function(base64Data){
        var decoded = new Array();
        var decodedStr = atob(base64Data);
        for(var i = 0; i < decodedStr.length; i++){
            decoded.push(decodedStr.charCodeAt(i));
        }
        return decoded;
    },
    saveThumb: function(uri, imageData){
        var base64Data = imageData;
        var headerIndex = base64Data.indexOf(this.header);
        if(headerIndex >= 0){
            base64Data = base64Data.substring(headerIndex + this.header.length);
        }
        var decoded = this.decode(base64Data);
        this.annoService.setPageAnnotationBinary(uri, this.thumbsAnno, decoded, decoded.length, "image/png", 0, this.annoService.EXPIRE_WITH_HISTORY);
    },
    saveProperties : function(uri, properties){
        var propertiesString = Converter.toJSONString(properties);
        this.annoService.setPageAnnotation(uri, this.propertiesAnno, propertiesString, 0, this.annoService.EXPIRE_WITH_HISTORY);
    },
    getProperty : function(uri){
        var anno = this.annoService.getPageAnnotation(uri, this.propertiesAnno);
        var annoProperties = Converter.fromJSONString(anno);
        return annoProperties;
    },
    getProperties : function(){
        var count = {};

        var annoUris = this.annoService.getPagesWithAnnotation(this.propertiesAnno, count);
        if(count.value == 0){
            return [];
        }

        var result = [];
        for(var i = 0; i < annoUris.lengt; i++){
                var properties = this.getProperty(annoUris[i]);
                properties.uri = annoUris[i];
                result.push(properties);
        }

        return result;
    },
    removeProperties : function(uris){
        for(var i = 0; i < uris.lengt; i ++){
            this.annoService.removePageAnnotation(uris[i], this.propertiesAnno);
        }
    },
    updateProperties : function(propertiesArray){
        for(var i = 0; i < propertiesArray.length; i ++){
            var uri = propertiesArray[i].uri;
            delete propertiesArray[i].uri;
            this.saveProperties(uri, propertiesArray[i]);
        }
    }
}