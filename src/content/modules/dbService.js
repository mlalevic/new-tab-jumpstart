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


let EXPORTED_SYMBOLS = ["PlacesDb", "AnnoService", "BookmarksService"];

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
    hasDetails: function(uri){
        return this.annoService.pageHasAnnotation(uri, this.propertiesAnno);
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
        for(var i = 0; i < annoUris.length; i++){
                var properties = this.getProperty(annoUris[i]);
                properties.uri = annoUris[i];
                result.push(properties);
        }

        return result;
    },
    removeProperties : function(propertiesArray){
        for(var i = 0; i < propertiesArray.length; i ++){
            this.annoService.removePageAnnotation(propertiesArray[i].uri, this.propertiesAnno);
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

let historyService = Components.classes["@mozilla.org/browser/nav-history-service;1"]
                                  .getService(Components.interfaces.nsINavHistoryService);
let BookmarksService = {
    LATEST : 12,
    RECENTLY_VISITED : 4,
    FREQUENT : 8,
    BY_TAG : 7,
    service : historyService,
    getBookmarks : function(placesUri){
        var queriesRef = {};
        var queryCountRef = {};
        var optionsRef = {};
        this.service.queryStringToQueries(placesUri, queriesRef, queryCountRef, optionsRef);
        // now use queriesRef.value, optionsRef.value
        var bookmarks = this.service.executeQueries(queriesRef.value, queryCountRef.value, optionsRef.value);
        bookmarks = bookmarks.root;
        var result = [];
        
        bookmarks.containerOpen = true;
        for (var i = 0; i < bookmarks.childCount; i ++) {
            var node = bookmarks.getChild(i);
            var fav = node.icon?node.icon.spec:"";
            var item = {
                title   : node.title,
                url     : node.uri,
                favicon : fav
            };
            result.push(item);
        }
        bookmarks.containerOpen = false;
        return result;
    },
    getBookmarksByParams : function(sort, limit, term, type){
        var query = "place:folder=BOOKMARKS_MENU&folder=UNFILED_BOOKMARKS&folder=TOOLBAR&queryType=1&excludeItemIfParentHasAnnotation=livemark%2FfeedURI&excludeQueries=1";
        if(sort){
            query = query + "&sort=" + sort;
        }

        if(limit){
            query = query + "&maxResults=" + limit;
        }

        if(type){
            query = query + "&type=" + type;
        }

        if(term){
            query = query + "&terms=" + term;
        }

        return this.getBookmarks(query);
    },
    getLatestBookmarks : function(count){
        //var query = "place:folder=BOOKMARKS_MENU&folder=UNFILED_BOOKMARKS&folder=TOOLBAR&queryType=1&sort=12&excludeItemIfParentHasAnnotation=livemark%2FfeedURI&maxResults=" + count +"&excludeQueries=1";
        //return this.getBookmarks(query);
        return this.getBookmarksByParams(this.LATEST, count);
    },
    getRecentlyVisitedBookmarks : function(count){
        return this.getBookmarksByParams(this.RECENTLY_VISITED, count);
    },
    getFrequentBookmarks : function(count){
        return this.getBookmarksByParams(this.FREQUENT, count);
    },
    getLatestByTag : function(count, tag){
        //var query = "place:folder=BOOKMARKS_MENU&folder=UNFILED_BOOKMARKS&folder=TOOLBAR&queryType=1&sort=12&excludeItemIfParentHasAnnotation=livemark%2FfeedURI&maxResults=" + count +"&excludeQueries=1&type=7&terms=" +tag;
        //return this.getBookmarks(query);
        return this.getBookmarksByParams(this.LATEST, count, tag, this.BY_TAG);
    },
    getRecentlyVisitedByTag : function(count, tag){
        return this.getBookmarksByParams(this.RECENTLY_VISITED, count, tag, this.BY_TAG);
    },
    getFrequentBookmarksByTag : function(count, tag){
        return this.getBookmarksByParams(this.FREQUENT, count, tag, this.BY_TAG);
    },
    getTags : function(){
        var query = "place:folder=TAGS&queryType=1&sort=1";

        var queriesRef = {};
        var queryCountRef = {};
        var optionsRef = {};
        this.service.queryStringToQueries(query, queriesRef, queryCountRef, optionsRef);
        // now use queriesRef.value, optionsRef.value
        var bookmarks = this.service.executeQueries(queriesRef.value, queryCountRef.value, optionsRef.value);
        bookmarks = bookmarks.root;
        var result = [];

        bookmarks.containerOpen = true;
        for (var i = 0; i < bookmarks.childCount; i ++) {
            var node = bookmarks.getChild(i);
            result.push(node.title);
        }
        bookmarks.containerOpen = false;
        return result;
    }
}