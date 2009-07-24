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

//TODO: (ML) unit-testing? comments, diagrams


var mlalevic;
if (!mlalevic) {
    mlalevic = {};
}

if (!mlalevic.ChromeDial) {
    mlalevic.ChromeDial = {};
}

if (!mlalevic.Utils) {
    mlalevic.Utils = {};
  }
  
  if (!mlalevic.JumpStart) {
    mlalevic.JumpStart = {};
  }

if (!mlalevic.JumpStart.Services) {
    mlalevic.JumpStart.Services = {};
  }

Components.utils.import("resource://modules/Observers.js", mlalevic.Utils);
Components.utils.import("resource://modules/utils.js", mlalevic.Utils);
Components.utils.import("resource://modules/browserServices.js", mlalevic.JumpStart.Services);

(function() {
    var Config = mlalevic.JumpStart.Services.JumpstartConfiguration;
    var Services = mlalevic.JumpStart.Services;

    mlalevic.ChromeDial.onMenuItemProperties = function(){
      var strbundle = document.getElementById("strings");
      window.openDialog("chrome://jumpstart/content/preferences/preferences.xul", strbundle.getString("properties_title"),
      "chrome,toolbar,centerscreen").focus();
    }
    
    mlalevic.ChromeDial.invertPrefValue = function(aName){
      Config.setBranchPref(aName, !(Config.getBranchPref(aName)));
    }
    
    //ensure number is between min and max (if over max then max, if under min then min)
    function respectBoundaries(min, max, current){
        var result = max < current?max:current;
        return result > min?result:min;
    }
    
    mlalevic.ChromeDial.checkThumbNumber = function(){
        var small = Config.Thumbs.ShowSmallThumbs;
        //set normal h & w
        Config.setThumbPref('NormalWidth', small?Config.Thumbs.DefaultSmallWidth:Config.Thumbs.DefaultWidth);
        Config.setThumbPref('NormalHeight', small?Config.Thumbs.DefaultSmallHeight:Config.Thumbs.DefaultHeight);
        
        var configParams = Services.BrowserServices.calculateMaxThumbs();
        var line = respectBoundaries(Config.Thumbs.MinLines, configParams.lines, Config.Thumbs.Lines);
        var col = respectBoundaries(Config.Thumbs.MinColumns, configParams.columns, Config.Thumbs.Columns);
        
        Config.setThumbPref('count', line*col);
        Config.setThumbPref('lines', line);
        
        var height = line * (Config.Thumbs.NormalHeight + 25);
        var width = col * (Config.Thumbs.NormalWidth + 15);
      
        Config.setThumbPref('ContainerHeight', height);
        Config.setThumbPref('ContainerWidth', width);
    }
    
    mlalevic.ChromeDial.invertThumbPrefValue = function(aName){
      Config.setThumbPref(aName, !(Config.getThumbPref(aName)));
    }
    
    mlalevic.ChromeDial.prepareMenu = function(){
      var items = {
        menu_newtab : Config.HookUpNewTab,
        menu_startup : Config.OverrideHomepage,
        menu_toolbar : Config.ShowToolbarButton,
        menu_history : Config.PersistThumbViewInHistory,
        menu_big : !Config.Thumbs.ShowSmallThumbs
      };
      
      for(var menuId in items){
        var element = document.getElementById(menuId);
        if(!element) continue;
        var atr = "checked";
        if(!element.hasAttribute(atr)){
          element.setAttribute(atr, false);
        }
        
        element.setAttribute(atr, items[menuId]);
      }
      
      return true;
    }

    
    var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindow);

    var topDial = mainWindow.mlalevic.ChromeDial;

/*
    try{
      topDial.clearUrlBar();
      topDial.GetBrowser(window).userTypedValue = "";
    }catch(ex){
      Services.Logger.error("Error clearing url bar", ex.message);
    }*/

    try{
      //set this entry not to be persisted if configured so
      if(!Config.PersistThumbViewInHistory){
        let historyUtility = topDial.GetHistoryUtility(window);
        historyUtility.SetCurrentPersist(false);
      }
    }catch(ex){
      Services.Logger.error("Error getting history utility", ex.message);
    }
    
    var utils = mainWindow.mlalevic.Utils;

    var Dial = mlalevic.ChromeDial;

    Dial.Show = function() {
        /*topDial.clearUrlBarForOurTab();
        topDial.registerForUpdate(Dial.showClosed);*/
        Dial.draw();
    }
    
    Dial.Unload = function(){
      topDial.unRegisterForUpdate(Dial.showClosed);
    }

    var loaded = false;

    Dial.draw = function() {

        if (loaded)
            return;
        loaded = true;
        
        Dial.drawThumbs();
        Dial.showClosed();
    }
    
    Dial.drawThumbs = function(){
      var data = topDial.getData();
      var service = topDial.getDataService();
      var container = document.getElementById("thumbsContainer");
      container.setup(Config.Thumbs, function(){ topDial.followedPage(this.href);});
      
      //TODO: (ML) this can go to service
      function handlePin(anUrl, aHost, aTitle, aFav){
        function criterion(anItem){ return anItem.host == aHost; }
        var thumb = service._thumbnailData.find(criterion);
        var pinnedItem = service._pinnedData.find(criterion);
        
        if(pinnedItem){
          service._pinnedData.removeByCriteria(criterion);
          thumb.pinned = false;
        }else{
          //{ url: aStatement.getString(0), title: aStatement.getString(1), fav: favurl, host: aStatement.getString(4), thumb: '' }
          service._pinnedData.add({index: 0, url: anUrl, host: aHost, title: aTitle, fav: aFav, pinned: true});
          service._removedData.removeByCriteria(criterion);
          thumb.pinned = true;
          thumb.toRemove = false;
        }
        
        container.refreshThumb(aHost, thumb);
      }
      
      //TODO: (ML) this can go to service
      function handleRemoved(aHost){
        function criterion(anItem){ return anItem.host == aHost; }
        var thumb = service._thumbnailData.find(criterion);
        var removedItem = service._removedData.find(criterion);
        
        if(removedItem){
          service._removedData.removeByCriteria(criterion);
          thumb.toRemove = false;
        }else{
          service._removedData.add({host: aHost});
          service._pinnedData.removeByCriteria(criterion);
          thumb.toRemove = true;
          thumb.pinned = false;
        }
        
        container.refreshThumb(aHost, thumb);
      }
      
      
      container.draw(data, handlePin, handleRemoved);
    }
    
    Dial.showClosed = function(){
      var tabClosedData = topDial.getClosedData();
        
        if(tabClosedData.length > 0){
            var closedBox = document.getElementById('recentlyClosedBox');
            var closedBoxItemsContainer = document.getElementById('recentlyClosedBoxItems');
            
            if(!closedBox)
              return;
              
            function drawClosed(){
              //clear children
              while(closedBoxItemsContainer.hasChildNodes()){
                  closedBoxItemsContainer.removeChild(closedBoxItemsContainer.firstChild);
              }
              
              
              for(var i = 0; i < tabClosedData.length; i++){
                  var item = tabClosedData[i];
                  var box = document.createElement("hbox");
                  box.setAttribute("class", "recentlyClosedItemBinding recentlyClosedItem");
                  closedBoxItemsContainer.appendChild(box);
                  box.draw(item, utils.Binder.bindArguments(this, topDial.UndoClose, i));
              }
            }
            
            if(closedBox.hidden){
              closedBox.hidden = false;
              closedBox.setAttribute("hidden", "false");
              //it won't show properly closed for hidden so set timeout
              window.setTimeout(drawClosed, 0);
            }else{
              drawClosed();
            }
        }else{
            var closedBox = document.getElementById('recentlyClosedBox');
            closedBox.hidden = true;
        }
    }
})();

function showThumbs(){
    var historyBox = document.getElementById('searchBox');
  var mainBox = document.getElementById('mainBox');
  
  historyBox.hidden = true;
  mainBox.hidden = false;
}

function historySearch(aInput) {
  var query = PlacesUtils.history.getNewQuery();
  var options = PlacesUtils.history.getNewQueryOptions();
  var historyTree = document.getElementById('historyTree');
  
  var historyBox = document.getElementById('searchBox');
  var mainBox = document.getElementById('mainBox');
  
  historyBox.hidden = false;
  mainBox.hidden = true;

  const NHQO = Ci.nsINavHistoryQueryOptions;
  var sortingMode;
  var resultType;

  if (aInput) {
    query.searchTerms = aInput;
    sortingMode = NHQO.SORT_BY_TITLE_ASCENDING;
    resultType = NHQO.RESULTS_AS_URI;
  }

  options.sortingMode = sortingMode;
  options.resultType = resultType;

  // call load() on the tree manually
  // instead of setting the place attribute in history-panel.xul
  // otherwise, we will end up calling load() twice
  historyTree.load([query], options);
}