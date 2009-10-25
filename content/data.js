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
Components.utils.import("resource://modules/config.js", mlalevic.JumpStart.services);
Components.utils.import("resource://modules/browserServices.js", mlalevic.JumpStart.Services);

//using (function(){...})(); construct so we won't polute our top level namespace
(function(){

  var services = mlalevic.JumpStart.Services; //this is private variable. Shorthand for services
  var Config = mlalevic.JumpStart.Services.JumpstartConfiguration; // shorthand for config
  
  var CachedData = function(browserService){
    this._browserService = browserService;
  }
  
  CachedData.prototype = {
    _filename : "",
    _data : [],
    _browserService : null,
    _load : function(){
      var loadedData = this._browserService.readFileToJson(this._filename);
      this._data = loadedData?loadedData:[];
    },
    _save : function(){
      this._browserService.saveObjectToFile(this._filename, this._data);
    },
    add : function(anItem){
      this._data.push(anItem);
      this._save();
    },
    _checkBounds : function(anIndex){
      if(anIndex < 0 || anIndex >= this._data.length){
        throw new Error("Index out of range!"); //TODO: (ML) create my own error class
      }
    },
    remove : function(anIndex){
      this._checkBounds(anIndex);
      this._data.splice(anIndex, 1);
      this._save();
    },
    
    removeByCriteria : function(aCriteria){
      for(var i = 0; i < this._data.length; i++){
        if(aCriteria(this._data[i])){
          this.remove(i);
        }
      }
    },
    
    find : function(aCriteria){
      for(var i = 0; i < this._data.length; i++){
        if(aCriteria(this._data[i])){
          return this._data[i];
        }
      }
      return null;
    },
    
    replace : function(anIndex, anItem){
      this._checkBounds(anIndex);
      this._data[anIndex] = anItem;
      this._save();
    }
  }
  
  var ThumbnailData = function(browserService){
    this._filename = "jumpstart.cache"; //filename of thumbnails cache
    this.superclass(browserService);
  }
  
  ThumbnailData.prototype = CachedData.prototype;
  ThumbnailData.prototype.superclass = CachedData;
  ThumbnailData.prototype.findByHost = function(aHost){
      for(var i = 0; i < this._data.length; i++){
        if(this._data[i].host == aHost){
          var dataToReturn = this._data[i];
          return {index : i, data: dataToReturn};
        }
      }
      return null;
  }
  
  var PinnedData = function(browserService){
    this._filename = "jumpstart.pinned"; //pinned items configuration file
    this.superclass(browserService);
  }
  
  PinnedData.prototype = CachedData.prototype;
  PinnedData.prototype.superclass = CachedData;
  
  var RemovedData = function(browserService){
    this._filename = "jumpstart.removed"; //removed items configuration file
    this.superclass(browserService);
  }
  
  RemovedData.prototype = CachedData.prototype;
  RemovedData.prototype.superclass = CachedData;
  
  var AlterThumbnailData = function(browserService){
    this._filename = "jumpstart.alter"; //alter thumbnail items configuration file
    this.superclass(browserService);
  }
  
  AlterThumbnailData.prototype = CachedData.prototype;
  AlterThumbnailData.prototype.superclass = CachedData;
  
  var DataStorage = function(browserService){
    this._browserService = browserService;
    //this._init(); //I want to make this explicitely required. The class is private so we are invoking this method only here, thus there's no problem with this, but where called will make code more readable
  }
  
  DataStorage.prototype = {
    LoadingImage : "chrome://jumpstart/skin/img/loading.png",
    IsInitialised : false, //is data initialized
    _thumbCount : Config.Thumbs.Count, //number of thumbnails to show
    _browserService : null,
    _thumbnailData : null,
    _mostFrequentData : [],
    _pinnedData : null,
    _removedData : null,
    _alterThumbnailData : null,
    _init : function(){
      this._thumbnailData = new ThumbnailData(this._browserService);
      this._thumbnailData._load();
      this._pinnedData = new PinnedData(this._browserService);
      this._pinnedData._load();
      this._removedData = new RemovedData(this._browserService);
      this._removedData._load();
      this._alterThumbnailData = new AlterThumbnailData(this._browserService);
      this._alterThumbnailData._load();
      if(this._alterThumbnailData._data.length == 0){ //initialize data
        //fixes gmail link to use html version (with javascript version it wasn't showing anything)
        this._alterThumbnailData.add({host:'moc.elgoog.liam.', exchangeUrl : 'https://mail.google.com/mail/?ui=html&zy=a'});
      }
      
      this._mostFrequentData = this._getMostFrequentData();
      this._prepareFrequentData();
    },
    
    //private method for filtering result
    //  for given thumbnail data item it is performing substitution of the url
    //  and checking if the item should be used
    // if true is returned the data item will be included, if false it will be omitted
    _filterMostFrequentData : function(aData){
      var findByHostCriterion = function(anItem){ return anItem.host == aData.host; };
      
      var removedItem = this._removedData.find(findByHostCriterion);
      if(removedItem){
        return false;
      }
      
      var found = this._alterThumbnailData.find(findByHostCriterion);
      if(found){
        aData.originalUrl = aData.url;
        aData.url = found.exchangeUrl;
      }
      
      return true; // at the moment we are always including data items
    },
    
    //retrieves most frequently accessed sites from the database
    _getMostFrequentData : function(){
      var result = [];
      var removedCount = this._removedData._data.length?this._removedData._data.length:0;
      var data = this._browserService.getMostVisitedData(this._thumbCount + removedCount); //retrieves data from database (add more data in for removed items)
      var len = data.length > this._thumbCount ? this._thumbCount : data.length; //fixes length for how many items we are retrieving
      var count = 0;
      
      //first load all pinned
      for(var i =0; i < this._pinnedData._data.length && count < len; i++){
        result.push(this._pinnedData._data[i]);
        count ++;
      }

      for(var i =0; i < data.length && count < len; i++){ //while there is data && we added less then the count of thumbs
        var findByHostCriterion = function(anItem){ return anItem.host == data[i].host; };
        
        if(this._filterMostFrequentData(data[i])){ //checks if data should be included
          //if pinned skip it since already added
          var pinned = this._pinnedData.find(findByHostCriterion);
          if(pinned){
            continue;
          }
          data[i].pinned = false;
          result.push(data[i]);
          count++;
        }else{
          //find in thumbnailData and remove if found
          this._thumbnailData.removeByCriteria(findByHostCriterion);
        }
      }
      return result;
    },
    
    _prepareFrequentData : function(){
      for(var i = 0; i < this._mostFrequentData.length; i++){
        var currentItem = this._mostFrequentData[i];
        var found = this._thumbnailData.findByHost(currentItem.host);
        if(found){
          currentItem.thumb = found.data.thumb;
        }else{
          currentItem.thumb = this.LoadingImage;
        }
      }
    },

    updateThumbData: function(i, thumbData) {
      this._mostFrequentData[i].thumb = thumbData;
      var found = this._thumbnailData.findByHost(this._mostFrequentData[i].host);
      if(found){
        this._thumbnailData.replace(found.index, this._mostFrequentData[i]);
      }else{
        this._thumbnailData.add(this._mostFrequentData[i]);
      }
    },
    get HasCachedData(){
      return this._thumbnailData && this._thumbnailData._data && this._thumbnailData._data.length > 0;
    },
    get CurrentData(){
      return this._mostFrequentData;
    }
  }
  
  DataStorage._dataKey = "mlalevic.JumpStart.Data";
  
  DataStorage._load = function(aService){
    if (Application.storage.has(DataStorage._dataKey)) {
      mlalevic.JumpStart.Data = Application.storage.get(DataStorage._dataKey, null);
    }else{
      mlalevic.JumpStart.Data = new DataStorage(aService);
      mlalevic.JumpStart.Data._init();
      Application.storage.set(DataStorage._dataKey, mlalevic.JumpStart.Data);
    }
  }

  DataStorage._load(services.BrowserServices);
  services.DataService = mlalevic.JumpStart.Data;
})();