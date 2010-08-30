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
    var services = {};
    Components.utils.import("resource://modules/dbService.js", services);

    function makeURI(aURL, aOriginCharset, aBaseURI) {
             var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                                        .getService(Components.interfaces.nsIIOService);
             return ioService.newURI(aURL, aOriginCharset, aBaseURI);
    }

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
            var found = this._removed.filter(function(element){return properties.host == element.host;});
            if(found && found.length > 0){
                return; //skip adding if in removed
            }
            this._currentData.push(properties);
        },
        getRemovedCount : function(){
            if(!this._removed) {return 0;}
            return this._removed.length;
        },
        getLatest : function(){
            return this._currentData;
        },
        getLatestCount: function(){
            if(!this._currentData){return 0;}
            return this._currentData.length;
        },
        _mapDomain: function(domain){
            var aMapping = this._mappings[domain];
            if(aMapping){
                return aMapping;
            }else{
                return null;
            }
        },
        _process: function(){
            //order original
            this._originalData.sort(function(a,b){return a.index - b.index;});
            //remove blocked from latest data

            //update those requiring update
            var updateRequired = this._originalData.filter(function(element){return element.requires_update;});
            if(updateRequired && updateRequired.length > 0){
                for(var i =0; i < updateRequired.length; i++){
                    //xxxxx
                    var uri = makeURI(updateRequired[i].url);
                    updateRequired[i].title = services.HistoryService.getPageTitle(uri);
                    if(updateRequired[i].title){
                        delete updateRequired[i].requires_update;
                    }
                }
            }

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
                    this._currentData[i].uri = makeURI(this._currentData[i].url);
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
            for(var i = 0; i < properties.length; i++){
                model._addOriginalEntry(properties[i]);
            }
            var latest = this.dbService.getMostVisitedData(this.latestCount + model.getRemovedCount());
            for(var i = 0; i < latest.length; i++){
                model._addLatest(latest[i]);
            }
            model._process();
            //at the end apply changes - remove all unused original properties, and add all new ones
            this.annoService.updateProperties(model._currentData);
            this.annoService.removeProperties(model._originalData);
            return model;
        },

        updateModel : function(){ //this is updating model when all thumbs are not present
            //use get data first to get all existing values
            latest = this.getData();
            if(!latest)return 0;

            //then call getmostvisiteddata to retrieve one entry per host
            current = this.dbService.getByMostVisitedHosts(1000); //we're expecting this only to be called very limited number of times
            //sort current by access count
            current.sort(function(a, b){return b.count - a.count;});
            //then for the unfilled values go through all the results and add one by one not found in the get data list

            result = [];
            for(var i = 0; i < current.length; i ++){
                if((latest.length + result.length) >= this.latestCount){
                    break;
                }

                var toAdd = true;
                for(var j = 0; j < latest.length; j++){
                    //alert("Host match:" + latest[j].host + " x " + current[i].host);

                    if(latest[j].host == current[i].host){
                        toAdd = false;
                        break;
                    }
                }
                if(toAdd){
                    result.push(current[i]);
                }
            }

            //add to annos
            for(var i = 0; i < result.length; i++){
                var props = result[i];
                props.index = latest.length -1 + i;
                props.pinned = false;
                this.annoService.saveProperties(makeURI(props.url), props);
            }

            return latest.length + result.length;
        }
    }

})();