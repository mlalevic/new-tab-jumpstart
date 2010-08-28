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

var mlalevic;
if (!mlalevic) { mlalevic = {}; }
if (!mlalevic.JumpStart) { mlalevic.JumpStart = {}; }
if (!mlalevic.JumpStart.Preferences) { mlalevic.JumpStart.Preferences = {}; }
if (!mlalevic.JumpStart.Services) { mlalevic.JumpStart.Services = {}; }


Components.utils.import("resource://modules/config.js", mlalevic.JumpStart.Services);
Components.utils.import("resource://modules/browserServices.js", mlalevic.JumpStart.Services);

(function() {
    var Preferences = mlalevic.JumpStart.Preferences;
    var Services = mlalevic.JumpStart.Services;
    var Config = Services.JumpstartConfiguration.Thumbs;
    
   
    //ensure number is between min and max (if over max then max, if under min then min)
    function respectBoundaries(min, max, current){
        var result = max < current?max:current;
        return result > min?result:min;
    }
    
    function $get(id){
      return document.getElementById(id);
    }
    
    Preferences.Thumbs = {
      slider : null,
      label : null,
      bigButton: null,
      smallButton: null,
      preferences : {
        small : null,
        lines : null,
        count : null
      },
      sizes : [],
      OnLoad : function(){
        this.slider = $get("thumbsNumberScale");
        this.label = $get("numberOfThumbs");
        this.bigButton = $get("largeThumbsButton");
        this.smallButton = $get("smallThumbsButton");
        
        this.preferences.small = $get("thumbShowSmall");
        this.preferences.lines = $get("thumbLines");
        this.preferences.columns = $get("thumbColumns");
        
        this.doHookup();
        
        //prepare buttons
        this.bigButton.checked = !this.preferences.small.value;// !Config.ShowSmallThumbs;
        this.smallButton.checked = this.preferences.small.value; //Config.ShowSmallThumbs;
      },
      doHookup: function(){
        var configForCalculation = {
          ShowSmallThumbs: this.preferences.small.value,
          MinColumns: 3,
          MinLines: 2
        };
        
        var configParams = Services.BrowserServices.calculateMaxThumbs(configForCalculation);

        this._hookup(2, configParams.lines, 3, configParams.columns);
        
        var line = respectBoundaries(2, configParams.lines, Config.Lines);
        var col = respectBoundaries(3, configParams.columns, Config.Columns);

        //find correct index and apply it to slider
        for(var i = 0; i < this.sizes.length; i++){
          if(this.sizes[i].line == line && this.sizes[i].col == col){
            this.slider.value = i;
            break;
          }
        }
      },
      _loadSizes : function(minlines, maxlines, mincols, maxcols){
        this.sizes = [];
        for(var lineCount = minlines; lineCount <= maxlines; lineCount++){
          for(var colCount = mincols; colCount <= maxcols; colCount ++){
            this.sizes.push({
              line: lineCount,
              col : colCount,
              count: lineCount * colCount
            });
          }
        }
        
        this.sizes.sort(function(a, b){return a.count - b.count;}); //order by number of thumbs
        return this.sizes;
      },
      _hookup: function(minlines, maxlines, mincols, maxcols){
        this._loadSizes(minlines, maxlines, mincols, maxcols);
        this.slider.max = this.sizes.length - 1;
        //pass in this, mlalevic...Preferences.Thumbs
        this.OnChange = function(slider, thumbprefs){
          thumbprefs.refreshText();
          thumbprefs.updateThumbCountConfig();
        }
      },
      refreshText : function(){
        this.label.value = this._getText(this._currentSize());
      },
      _getText : function(dimensions){
        return "(" + dimensions.col + "x" + dimensions.line + ") " + this.sizes[this.slider.value].count;
      },
      OnSizeChange: function(thumbprefs){
        thumbprefs.sizeChange();
      },
      updateThumbCountConfig : function(){
        this.preferences.lines.value = this._currentSize().line;
        this.preferences.columns.value = this._currentSize().col;
      },
      _updateSizeConfig : function(){
        var p = this.preferences;
        p.small.value = this.smallButton.checked;
      },
      _currentSize : function(){
        return this.sizes[this.slider.value];
      },
      sizeChange: function(){
        //do calc
        this._updateSizeConfig();
        this.doHookup();
        this.updateThumbCountConfig();
      }
    };    
})();

(function() {
    var checkedIcon = "chrome://jumpstart/skin/icon/ok.png";
    var errorIcon = "chrome://jumpstart/skin/icon/error.png";
    var infoIcon = "chrome://jumpstart/skin/icon/info.png";
    var warningIcon = "chrome://jumpstart/skin/icon/warning.png";
        
    var Preferences = mlalevic.JumpStart.Preferences;
    Preferences.Info = {
      extensions : null,
      OnLoad : function(){
        var historyService = Components.classes["@mozilla.org/browser/nav-history-service;1"]
                               .getService(Components.interfaces.nsINavHistoryService);

        var strbundle = document.getElementById("strings");

        this.extensions = [
                    /*{id: '{05BF52F6-A4F9-48B9-84ED-F8D83762E619}', src: infoIcon, text: 'New Tab Button Position - Fixed in this version' }, */
                    {id: '{dc572301-7619-498c-a57d-39143191b318}', src: warningIcon, text: strbundle.getString("tab_mix_details")}
                    ];
        
        var historyStatus = document.getElementById("historyStatus");
        var historyData = document.getElementById("historyData");
        var compatibility = document.getElementById("compatibility");

        if(historyService.hasHistoryEntries){
          historyData.childNodes[0].src = checkedIcon;
          historyData.childNodes[1].value = strbundle.getString("history_has_entries");
        }else{
          historyData.childNodes[0].src = warningIcon;
          historyData.childNodes[1].value = strbundle.getString("history_no_entries");
        }
        
        if(historyService.historyDisabled){
          historyStatus.childNodes[0].src = errorIcon;
          historyStatus.childNodes[1].value = strbundle.getString("history_disabled");
        }else{
          historyStatus.childNodes[0].src = checkedIcon;
          historyStatus.childNodes[1].value = strbundle.getString("history_enabled");
        }

        var thisObj = this;
        function checkCompatibility(ext){
            var compatibilityIssue = false;

            for(var i = 0; i < ext.length; i++){
              if(thisObj.checkInCompatibility(compatibility, ext[i].id)){
                compatibilityIssue = true;
              }
            }

            if(!compatibilityIssue){
              thisObj.addCompatibilityItem(compatibility, infoIcon, strbundle.getString("no_compatibility_issues"));
            }
        }

        if(!Application.extensions){
            Application.getExtensions(checkCompatibility);
        }else{
            checkCompatibility(Application.extensions.all);
        }

        this.populateRemovedData();
        this.populateTackedData();
      },    
      addCompatibilityItem : function(parent, src, text){
        var listitem = document.createElement("richlistitem");
        var image = document.createElement("image");
        var label = document.createElement("label");
        
        image.setAttribute("src", src);
        label.setAttribute("value", text);
        label.setAttribute("crop", "end");
        label.setAttribute("tooltiptext", text);
        listitem.appendChild(image);
        listitem.appendChild(label);
        parent.appendChild(listitem);
      },  
      checkInCompatibility : function(compatibility, id){
        for(var i = 0; i < this.extensions.length; i++){
          var e = this.extensions[i];
          if(id == e.id){
            this.addCompatibilityItem(compatibility, e.src, e.text);
            return true;
          }
        }
        return false;
      },
      populateRemovedData : function(){
            var services = {};
            Components.utils.import("resource://modules/dbService.js", services);

            var properties = services.AnnoService.getProperties();
            var removed = properties.filter(function(element){return element.removed;});
            var list = document.getElementById('removedItems');

            while(list.itemCount > 0){
                list.removeItemAt(0);
            }

            for(var i=0; i < removed.length; i++){
                var label = removed[i].url;
                var item = list.appendItem(label, '');
                item.properties = removed[i];
            }
      },
      populateTackedData : function(){
            var services = {};
            Components.utils.import("resource://modules/dbService.js", services);

            var properties = services.AnnoService.getProperties();
            var pinned = properties.filter(function(element){return element.pinned;});
            var list = document.getElementById('tackedItems');

            while(list.itemCount > 0){
                list.removeItemAt(0);
            }

            for(var i=0; i < pinned.length; i++){
                var label = pinned[i].url;
                var item = list.appendItem(label, '');
                item.properties = pinned[i];
            }
      },
      undoRemoved : function(){
        var services = {};
        Components.utils.import("resource://modules/dbService.js", services);

        var list = document.getElementById('removedItems');
        var selectedItems = list.selectedItems;

        if(selectedItems.length == 0){
            return;
        }

        var propertiesToRemove = [];
        for(var i=0; i < selectedItems.length; i++){
            propertiesToRemove.push(selectedItems[i].properties);
        }

        services.AnnoService.removeProperties(propertiesToRemove);

        this.populateRemovedData();
      },
      undoTacked : function(){
        var services = {};
        Components.utils.import("resource://modules/dbService.js", services);

        var list = document.getElementById('tackedItems');
        var selectedItems = list.selectedItems;

        if(selectedItems.length == 0){
            return;
        }

        var propertiesToRemove = [];
        for(var i=0; i < selectedItems.length; i++){
            selectedItems[i].properties.pinned = false;
            propertiesToRemove.push(selectedItems[i].properties);
        }

        services.AnnoService.updateProperties(propertiesToRemove);

        this.populateTackedData();
      },
      processSitesTextBox : function(handleProperty, getProperty, postProcess){
        var Services = {};
        Components.utils.import("resource://modules/dbService.js", Services);
        Components.utils.import("resource://modules/browserServices.js", Services);

        var fullText = document.getElementById('newTackedBlocked').value;
        var items = fullText.split("\r\n");
        if(items.length <= 1){
            items = fullText.split("\n");
        }

        var propertiesToAdd = [];
        var propertiesToUpdate = [];
        for(var i = 0; i<items.length; i++){
            if(!items[0] || items[0].length == 0)continue;

            try{
                var uri = Services.AnnoService.makeURI(items[i]);
                var property = null;
                if(Services.AnnoService.hasDetails(uri)){
                    property = Services.AnnoService.getProperty(uri);
                    handleProperty(property);
                    propertiesToUpdate.push(property);
                }else{
                    property = getProperty(items[i]);
                    propertiesToAdd.push(property);
                }
            }catch(ex){
                Services.Logger.error("Error creating uri for blocked site: " + items[i], ex.message);
            }
        }


        if(propertiesToUpdate.length > 0){
            Services.AnnoService.updateProperties(propertiesToUpdate);
        }

        if(propertiesToAdd.length > 0){
            for(var i=0; i<propertiesToAdd.length; i++){
                Services.AnnoService.saveProperties(Services.AnnoService.makeURI(propertiesToAdd[i].url), propertiesToAdd[i]);
            }
        }

        postProcess();

        this.populateTackedData();
        this.populateRemovedData();
      },
      blockSites : function(){
        this.processSitesTextBox(
            function(property){property.removed = true;property.pinned = false;},
            function(url){return { url: url, title: '', fav: '', host: '', place_id: '', thumb: '', removed: true, pinned: false, requires_update:true };},
            function(){}
        );
      },
      tackSites : function(){
        var Services = {};
        Components.utils.import("resource://modules/dbService.js", Services);
        var getData = function(){
            var properties = Services.AnnoService.getProperties();
            var result = properties.filter(function(element){return !element.removed;});
            result.sort(function(a,b){return a.index - b.index;});
            return result;
        }
        var findNextNonTacked = function(data, currentIndex){
            for(var i=currentIndex - 1;i >= 0;i--){
                if(!data[i].pinned){
                    return i;
                }
            }
            return -1;
        }

        var data = getData();
        //find max index:
        var maxIndex = 0;
        for(var i = 0; i < data.length; i++){
            if(data[i].index > maxIndex)maxIndex = data[i].index;
        }
        var currentIndex = maxIndex + 1;

        this.processSitesTextBox(
            function(property){property.removed = false; property.pinned = true;},
            function(url){
                var properties = { url: url, title: '', fav: '', host: '', place_id: '', thumb: '', removed: false, pinned: true, requires_update:true };
                if(currentIndex >= 0){
                    currentIndex = findNextNonTacked(data, currentIndex);
                }

                if(currentIndex >=0){
                    properties.index = currentIndex;
                }else{
                    maxIndex += 1;
                    properties.index = maxIndex;
                }
                return properties;
            },
            function(){
                if(currentIndex <=0){
                    currentIndex = 0;
                }
                var updated = data.filter(function(element){return !element.pinned && element.index>=currentIndex});
                for(var i=0; i < updated.length; i++){
                    updated[i].index = (++maxIndex);
                }
                Services.AnnoService.updateProperties(updated);
            }
        );
      }
    }
})();


(function() {

    var Preferences = mlalevic.JumpStart.Preferences;
    Preferences.onPickImage = function(){
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, "Select a File", nsIFilePicker.modeOpen);
        fp.appendFilters(nsIFilePicker.filterImages);
        fp.appendFilters(nsIFilePicker.filterAll);
        var res = fp.show();
        if (res == nsIFilePicker.returnOK){
          var thefile = fp.file;
          document.getElementById("bkgImage").value = encodeURI("file:///" + thefile.path.replace(/\\/g,"/"));
        }
    }
})();