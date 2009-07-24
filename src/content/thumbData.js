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
        addOriginalEntry : function(properties){
            this._originalData.push(properties);
        },
        addLatest : function(){
            this._currentData.push(properties);
        },
        getLatest : function(){

        },
        getDisabled : function(){

        },
        _mapDomain: function(domain){
            var aMapping = mappings[domain];
            if(aMapping){
                return aMapping;
            }else{
                return null;
            }
        },
        _compareList: function(){
            
        }
    }


    model.Factory = function(dbService, latestCount){
        this.dbService = dbService;
        this.latestCount = latestCount;
    }

    model.Factory.prototype = {
        dbService : null,
        latestCount : 0,
        readModel : function(){
            var model = new model.ThumbData();
            var properties = this.dbService.getProperties();
            for(var i = 0; i < properties.lengt; i++){
                model.addOriginalEntry(properties[0]);
            }
            var latest = this.dbService.getMostVisitedData(this.latestCount);
            for(var i = 0; i < latest.count; i++){
                model.addLatest(latest[i]);
            }
            model._compareList();
            return model;
        }
    }

})();