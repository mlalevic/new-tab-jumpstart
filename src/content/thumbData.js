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
Copyright (C) 2009, Mihailo Lalevic. All Rights Reserved.

Contributor(s):
**** END LICENSE BLOCK **** */


//setup namespaces
var mlalevic;
if (!mlalevic) {
    mlalevic = {};
}


if (!mlalevic.JumpStart) {
  mlalevic.JumpStart = {};
}

if (!mlalevic.JumpStart.Model) {
  mlalevic.JumpStart.Model = {};
}


//** end setup namespaces


(function(){
    var model = mlalevic.JumpStart.Model;

    model.ThumbData = function(){

    }

    model.ThumbData.prototype = {
        _originalData : [],
        _mappings : [],
        _currentData : [],
        _removed : [],
        _addOriginalEntry : function(properties){
            if(properties.removed){
                this._removed.push(properties);
                return;
            }
            
            this._originalData.push(properties);
        },
        _addLatest : function(properties){
            this._currentData.push(properties);
        },
        getLatest : function(){
            return this._currentData;
        },
        _mapDomain: function(domain){
            var aMapping = this._mappings[domain];
            if(aMapping){
                return aMapping;
            }else{
                return null;
            }
        },
        _makeURI : function (aURL, aOriginCharset, aBaseURI) {
             var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                                        .getService(Components.interfaces.nsIIOService);
             return ioService.newURI(aURL, aOriginCharset, aBaseURI);
        },
        _process: function(){
            //order original
            this._originalData.sort(function(a,b){return a.index - b.index;});
            //remove blocked from latest data

            //find all pinned
            var pinned = this._originalData.filter(function(element){return element.pinned;});
            //remove pinned from current
            if(pinned && pinned.length > 0){
                for(var i = 0; i < pinned.length; i++){
                    var found = this._currentData.filter(function(element){return element.url == pinned[i].url});
                    if(found && found.length > 0){
                        for(var j=0; j < found.length; j++){
                            this._currentData.splice(this._currentData.indexOf(found[j]), 1);
                        }
                    }
                }
                //add onto pinned location
                for(var i=0; i < pinned.length; i++){
                    if(pinned[i].index > this._currentData.length){
                        break;
                    }
                    this._currentData.splice(pinned[i].index,0, pinned[i]);
                    this._originalData.splice(this._originalData.indexOf(pinned[i]), 1);
                }
            }
            //go through one by one in original and populate if exists in latest
            for(var i = 0; i < this._currentData.length; i++){
                var current = this._currentData[i];
                var found = this._originalData.filter(function(element){return element.url == current.url;});
                if(found && found.length > 0){
                    this._currentData[i] = found[0];
                    this._originalData.splice(this._originalData.indexOf(found[0]), 1);
                }
            }
            //reindex current and populate default values
            for(var i = 0; i < this._currentData.length; i++){
                this._currentData[i].index = i;
                if(!("pinned" in this._currentData[i])){
                    //////???
                    this._currentData[i].pinned = false;
                    this._currentData[i].uri = this._makeURI(this._currentData[i].url);
                }
            }
        }
    }


    model.Service = function(dbService, annoService, latestCount){
        this.dbService = dbService;
        this.latestCount = latestCount;
        this.annoService = annoService;
    }

    model.Service.prototype = {
        dbService : null,
        annoService : null,
        latestCount : 0,
        getData: function(){
            var properties = this.annoService.getProperties();
            var result = properties.filter(function(element){return !element.removed;});
            result.sort(function(a,b){return a.index - b.index;});
            return result;
        },
        processModel : function(){
            var model = new mlalevic.JumpStart.Model.ThumbData();
            var properties = this.annoService.getProperties();
            for(var i = 0; i < properties.lengt; i++){
                model._addOriginalEntry(properties[i]);
            }
            var latest = this.dbService.getMostVisitedData(this.latestCount);
            for(var i = 0; i < latest.length; i++){
                model._addLatest(latest[i]);
            }
            model._process();
            //at the end apply changes - remove all unused original properties, and add all new ones
            this.annoService.updateProperties(model._currentData);
            this.annoService.removeProperties(model._originalData);
            return model;
        }
    }

})();