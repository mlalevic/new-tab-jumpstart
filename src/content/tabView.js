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
if(!mlalevic){mlalevic = {};}
if(!mlalevic.Utils){mlalevic.Utils = {};}
if(!mlalevic.JumpStart){mlalevic.JumpStart = {};}

(function(){
    var utils = mlalevic.Utils;
    var services = {}
    Components.utils.import("resource://modules/Observers.js", utils);
    Components.utils.import("resource://modules/utils.js", utils);
    Components.utils.import("resource://modules/browserServices.js", services);
    Components.utils.import("resource://modules/dbService.js", services);

    var Config;
    Config = services.JumpstartConfiguration;

    mlalevic.JumpStart.onMenuItemProperties = function(){
      var strbundle = document.getElementById("strings");
      window.openDialog("chrome://jumpstart/content/preferences/preferences.xul", strbundle.getString("properties_title"),
      "chrome,toolbar,centerscreen").focus();
    }

    mlalevic.JumpStart.invertPrefValue = function(aName){
      Config.setBranchPref(aName, !(Config.getBranchPref(aName)));
    }

    //ensure number is between min and max (if over max then max, if under min then min)
    function respectBoundaries(min, max, current){
        var result = max < current?max:current;
        return result > min?result:min;
    }

    mlalevic.JumpStart.checkThumbNumber = function(){
        var small = Config.Thumbs.ShowSmallThumbs;
        //set normal h & w
        Config.setThumbPref('NormalWidth', small?Config.Thumbs.DefaultSmallWidth:Config.Thumbs.DefaultWidth);
        Config.setThumbPref('NormalHeight', small?Config.Thumbs.DefaultSmallHeight:Config.Thumbs.DefaultHeight);

        var configParams = services.BrowserServices.calculateMaxThumbs();
        var line = respectBoundaries(Config.Thumbs.MinLines, configParams.lines, Config.Thumbs.Lines);
        var col = respectBoundaries(Config.Thumbs.MinColumns, configParams.columns, Config.Thumbs.Columns);

        Config.setThumbPref('count', line*col);
        Config.setThumbPref('lines', line);

        var height = line * (Config.Thumbs.NormalHeight + 25);
        var width = col * (Config.Thumbs.NormalWidth + 15);

        Config.setThumbPref('ContainerHeight', height);
        Config.setThumbPref('ContainerWidth', width);
    }

    mlalevic.JumpStart.invertThumbPrefValue = function(aName){
      Config.setThumbPref(aName, !(Config.getThumbPref(aName)));
    }

    mlalevic.JumpStart.prepareMenu = function(){
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


    try{
      //set this entry not to be persisted if configured so
      if(!Config.PersistThumbViewInHistory){
        var historyUtility = services.BrowserServices.GetHistoryUtility(window);
        historyUtility.SetCurrentPersist(false);
      }
    }catch(ex){
      services.Logger.error("Error getting history utility", ex.message);
    }

    var dataRefreshEvent = "mlalevic.JumpStart.refresh";
    var bookmarksChangedEvent = "mlalevic.JumpStart.bookmarks";


    var Show = function() {
        /*topDial.clearUrlBarForOurTab();
        topDial.registerForUpdate(Dial.showClosed);*/
        utils.Observers.add(showClosed, dataRefreshEvent);
        utils.Observers.add(showBookmarks, bookmarksChangedEvent);
        draw();
    }

    var Unload = function(){
      utils.Observers.remove(showClosed, dataRefreshEvent);
      utils.Observers.remove(showBookmarks, bookmarksChangedEvent);
    }

    var makeURI = function (aURL, aOriginCharset, aBaseURI) {
             var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                                        .getService(Components.interfaces.nsIIOService);
             return ioService.newURI(aURL, aOriginCharset, aBaseURI);
    }


    var loaded = false;

    var draw = function() {

        if (loaded)
            return;
        loaded = true;

        drawThumbs();
        showClosed();
        showBookmarks();
    }

    var getData = function(){
            var properties = services.AnnoService.getProperties();
            var result = properties.filter(function(element){return !element.removed;});
            result.sort(function(a,b){return a.index - b.index;});
            return result;
    }

    var drawThumbs = function(){
      var data = getData();
      var container = document.getElementById("siteTileContainer");

      function handleClick(){
        services.BrowserServices.FollowedPage(this.href);
      }

      function handlePin(properties){
        properties.pinned = !properties.pinned;
        properties.uri = makeURI(properties.url);
        services.AnnoService.updateProperties([properties]);
        //container.refreshThumb(properties);
      }

      function handleRemoved(properties){
        if(properties.removed){
            properties.removed = false;
        }else{
            properties.removed = true;
        }
        properties.uri = makeURI(properties.url);
        services.AnnoService.updateProperties([properties]);
        //container.refreshThumb(properties);
      }

      container.draw(data, Config.Thumbs, handleClick, handlePin, handleRemoved);
    }

    var showClosed = function(){
      var tabClosedData = services.BrowserServices.GetClosedData();

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
                  box.setAttribute("class", "recentlyClosedItem");
                  closedBoxItemsContainer.appendChild(box);
                  box.draw(item, utils.Binder.bindArguments(this, services.BrowserServices.UndoClosed, i));
              }
            }

            if(closedBox.hidden){
              closedBox.hidden = false;
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

    var showBookmarks = function(){
      var bookmarksData = services.BookmarksService.getLatestBookmarks(10);
      //var bookmarksData = services.BrowserServices.GetBookmarkData();      
      var bookmarksContainer = document.getElementById('recentBookmarksContainer');
      var bookmarksItemsContainer = document.getElementById('recentBookmarksItems');
      if (!bookmarksContainer || !bookmarksItemsContainer)
        return;
      
      function drawItems() {
        //clear children
        while(bookmarksItemsContainer.hasChildNodes()){
          bookmarksItemsContainer.removeChild(bookmarksItemsContainer.firstChild);
        }
              
        for (var i = 0; i < bookmarksData.length; i++) {
          var item = bookmarksData[i];
          var box = document.createElement("hbox");
          box.setAttribute("class", "recentBookmarksItem");
          bookmarksItemsContainer.appendChild(box);
          box.draw(item.url, item.title, item.favicon, function(){window.location=this.href});
        }
      }
      
      if (bookmarksData.length > 0) {
            
        if (bookmarksContainer.hidden) {
          bookmarksContainer.hidden = false;
          bookmarksContainer.setAttribute("hidden", "false");
          //it won't show properly closed for hidden so set timeout
          window.setTimeout(drawItems, 0);
        } else {
          drawItems();
        }

      } else {
        bookmarksContainer.hidden = true;
      }
    }

    mlalevic.JumpStart.showThumbs = function(){
      var historyBox = document.getElementById('searchBox');
      var mainBox = document.getElementById('mainBox');

      historyBox.hidden = true;
      mainBox.hidden = false;
    }

    mlalevic.JumpStart.historySearch = function(aInput) {
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

window.addEventListener("load", Show, false);
window.addEventListener("unload", Unload, false);
})();