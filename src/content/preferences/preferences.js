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
if (!mlalevic) {
    mlalevic = {};
}

  
if (!mlalevic.JumpStart) {
  mlalevic.JumpStart = {};
}

if (!mlalevic.JumpStart.Preferences) {
    mlalevic.JumpStart.Preferences = {};
}

if (!mlalevic.JumpStart.Services) {
    mlalevic.JumpStart.Services = {};
}


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
        count : null,
        containerW : null,
        containerH : null,
        normalW : null,
        normalH : null
      },
      sizes : [],
      OnLoad : function(){
        this.slider = $get("thumbsNumberScale");
        this.label = $get("numberOfThumbs");
        this.bigButton = $get("largeThumbsButton");
        this.smallButton = $get("smallThumbsButton");
        
        this.preferences.small = $get("thumbShowSmall");
        this.preferences.lines = $get("thumbLines");
        this.preferences.count = $get("thumbCount");
        this.preferences.containerW = $get("containerWidth");
        this.preferences.containerH = $get("containerHeight");
        this.preferences.normalW = $get("normalWidth");
        this.preferences.normalH = $get("normalHeight");
        
        this.doHookup();
        
        //prepare buttons
        this.bigButton.checked = !this.preferences.small.value;// !Config.ShowSmallThumbs;
        this.smallButton.checked = this.preferences.small.value; //Config.ShowSmallThumbs;
      },
      doHookup: function(){
        var configForCalculation = {
          ShowSmallThumbs: this.preferences.small.value,
          DefaultSmallWidth: Config.DefaultSmallWidth,
          DefaultWidth: Config.DefaultWidth,
          DefaultSmallHeight: Config.DefaultSmallHeight,
          DefaultHeight: Config.DefaultHeight,
          LargeHeight: Config.LargeHeight,
          NormalHeight: this.preferences.normalH.value,
          NormalWidth: this.preferences.normalW,
          MinColumns: Config.MinColumns,
          MinLines: Config.MinLines
        };
        
        var configParams = Services.BrowserServices.calculateMaxThumbs(configForCalculation);
        //var configParams = Services.BrowserServices.calculateMaxThumbs();
        this._hookup(Config.MinLines, configParams.lines, Config.MinColumns, configParams.columns);
        
        var line = respectBoundaries(Config.MinLines, configParams.lines, Config.Lines);
        var col = respectBoundaries(Config.MinColumns, configParams.columns, Config.Columns);
        //this.refreshText({line: line, col: col, count: line * col });
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
        this.preferences.count.value = this._currentSize().count;
        this._updateContainerSize();
      },
      _updateSizeConfig : function(){
        var p = this.preferences;
        p.small.value = this.smallButton.checked;
        //set normal h & w
        if(this.smallButton.checked){
          p.normalH.value = Config.DefaultSmallHeight;
          p.normalW.value = Config.DefaultSmallWidth;
        }else{
          p.normalH.value = Config.DefaultHeight;
          p.normalW.value = Config.DefaultWidth;
        }
      },
      _currentSize : function(){
        return this.sizes[this.slider.value];
      },
      _updateContainerSize: function(){
        var height = this._currentSize().line * (this.preferences.normalH.value + 25);
        var width = this._currentSize().col * (this.preferences.normalW.value + 15);
      
        this.preferences.containerH.value = height;
        this.preferences.containerW.value = width;
      },
      sizeChange: function(){
        //do calc
        this._updateSizeConfig();
        this.doHookup();
        this.updateThumbCountConfig();
      }
    };
    
    Preferences.OnChange = function(){
      //var tbLines = document.getElementById("thumbLines");
      var tbLinesControl = document.getElementById("thumbLinesControl");
      var tbColumns = document.getElementById("thumbColumnsControl");
      var tbCount = document.getElementById("thumbCount");
      var tbWidth = document.getElementById("containerWidth");
      var tbHeight = document.getElementById("containerHeight");
      var prefNormalWidth = document.getElementById("normalWidth");
      var prefNormalHeight = document.getElementById("normalHeight");
      var prefSmallWidth = document.getElementById("smallWidth");
      var prefSmallHeight = document.getElementById("smallHeight");
      
      tbCount.value = tbLinesControl.value * tbColumns.value;
      
      var height = tbLinesControl.value * (prefNormalHeight.value + 25); //TODO: (ML) put this in browser services
      var width = tbColumns.value * (prefNormalWidth.value + 15); //TODO: (ML) put this in browser services
      tbHeight.value = height;
      tbWidth.value =  width;
      
      //calculate small size
      var columns = tbColumns.value;
      var smallWidth = Math.floor((width - (Config.LargeWidth + 14))/(columns - 1)) - 14; //TODO: (ML) move to browser services
      var smallHeight = Math.floor(smallWidth / 1.44);
      prefSmallWidth.value = smallWidth;
      prefSmallHeight.value = smallHeight;
      
    }
    
    Preferences.OnShowSmallChange = function(){

      var tbLines = document.getElementById("thumbLines");
      var tbLinesControl = document.getElementById("thumbLinesControl");
      var tbColumns = document.getElementById("thumbColumnsControl");
      var tbCount = document.getElementById("thumbCount");
      var tbWidth = document.getElementById("containerWidth");
      var tbHeight = document.getElementById("containerHeight");
      var cbSmall = document.getElementById("thumbShowSmallControl");
      
      var prefNormalWidth = document.getElementById("normalWidth");
      var prefNormalHeight = document.getElementById("normalHeight");
      var prefSmallWidth = document.getElementById("smallWidth");
      var prefSmallHeight = document.getElementById("smallHeight");
      
      if(cbSmall.checked){
        prefNormalHeight.value = Config.DefaultSmallHeight;
        prefNormalWidth.value = Config.DefaultSmallWidth;
      }else{
        prefNormalHeight.value = Config.DefaultHeight;
        prefNormalWidth.value = Config.DefaultWidth;
      }
      
      var configForCalculation = {
        ShowSmallThumbs: cbSmall.checked,
        DefaultSmallWidth: Config.DefaultSmallWidth,
        DefaultWidth: Config.DefaultWidth,
        DefaultSmallHeight: Config.DefaultSmallHeight,
        DefaultHeight: Config.DefaultHeight,
        LargeHeight: Config.LargeHeight,
        NormalHeight: prefNormalHeight.value,
        NormalWidth: prefNormalWidth.value,
        MinColumns: Config.MinColumns,
        MinLines: Config.MinLines
      };
      
      var configParams = Services.BrowserServices.calculateMaxThumbs(configForCalculation);
      
      tbLinesControl.min = Config.MinLines;
      tbLinesControl.max = configParams.lines;
      tbColumns.min = Config.MinColumns;
      tbColumns.max = configParams.columns;
      let lines = configParams.lines < Config.Lines?configParams.lines:Config.Lines;
      lines = lines > Config.MinLines?lines:Config.MinLines;
      tbLines.value = lines;
      tbLinesControl.value = lines; //seems that without this does not enable spin buttons correctly
      let columns = configParams.columns < Config.Columns?configParams.columns:Config.Columns;
      lines = lines > Config.MinColumns?columns:Config.MinColumns;
      tbColumns.value = columns;
      tbCount.value = lines * columns;
      
      var height = tbLines.value * (prefNormalHeight.value + 25); //TODO: (ML) put this in browser services
      var width = tbColumns.value * (prefNormalWidth.value + 15); //TODO: (ML) put this in browser services
      
      tbHeight.value = height;
      tbWidth.value = width;
      
      //calculate small size
      var smallWidth = Math.floor((width - (Config.LargeWidth + 14))/(columns - 1)) - 14; //TODO: (ML) move to browser services
      var smallHeight = Math.floor(smallWidth / 1.44);
      prefSmallWidth.value = smallWidth;
      prefSmallHeight.value = smallHeight;
    }
    
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
        
        var extensions = Application.extensions.all;
        var compatibilityIssue = false;
        
        for(var i = 0; i < extensions.length; i++){
          if(this.checkInCompatibility(compatibility, extensions[i].id)){
            compatibilityIssue = true;
          }
        }
        
        if(!compatibilityIssue){
          this.addCompatibilityItem(compatibility, infoIcon, strbundle.getString("no_compatibility_issues"));
        }
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
      }
    }
})();