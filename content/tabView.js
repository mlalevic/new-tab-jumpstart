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

var BookmarksEventHandler = null; //workaround for BookmarksEventHandler defined in browser.js

(function(){
    var utils = mlalevic.Utils;
    var services = {}
    Components.utils.import("resource://modules/Observers.js", utils);
    Components.utils.import("resource://modules/utils.js", utils);
    Components.utils.import("resource://modules/config.js", services);
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

    mlalevic.JumpStart.toggleBookmarksToolbar = function(){
        mlalevic.JumpStart.invertPrefValue("show_bookmarks_toolbar");
        showBookmarksToolbar();
    }

    mlalevic.JumpStart.toggleSidebar = function(){
        mlalevic.JumpStart.invertPrefValue("show_sidebar");
        showSidebar();
    }

    mlalevic.JumpStart.releaseNotes = function(){
        Config.setBranchPref("show_notice", false);
        window.location = "http://www.new-tab-jumpstart.com/releases";
    }

    //ensure number is between min and max (if over max then max, if under min then min)
    function respectBoundaries(min, max, current){
        var result = max < current?max:current;
        return result > min?result:min;
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

    function getBrowserWindow(){
        /*return window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
            .getInterface(Components.interfaces.nsIWebNavigation)
            .QueryInterface(Components.interfaces.nsIDocShellTreeItem).treeOwner
            .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
            .getInterface(Components.interfaces.nsIDOMWindow);*/
        return window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
               .getInterface(Components.interfaces.nsIWebNavigation)
               .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
               .rootTreeItem
               .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
               .getInterface(Components.interfaces.nsIDOMWindow);
    }

    function getMainXulWindow(){
        return window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
            .getInterface(Components.interfaces.nsIWebNavigation)
            .QueryInterface(Components.interfaces.nsIDocShellTreeItem).treeOwner
            .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
            .getInterface(Components.interfaces.nsIXULWindow);
    }

    function getHistorytility(){
        var bro = getBrowserWindow().getBrowserFromContentWindow(window);
        var internalHistory = bro.sessionHistory.QueryInterface(Ci.nsISHistoryInternal);
        return new mlalevic.Utils.HistoryUtility(internalHistory);
    }


    try{
      //set this entry not to be persisted if configured so
      if(!Config.PersistThumbViewInHistory){
        var historyUtility = getHistorytility();
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
      updateNoticeConfig();
    }

    function updateNoticeConfig(){
        if(Config.ShowNotice){
            var notification = document.getElementById("whatsNew");
            if(!(notification)){ //the element will be removed if notification box closed
                mlalevic.JumpStart.invertPrefValue("show_notice");
            }
        }
    }

    var makeURI = function (aURL, aOriginCharset, aBaseURI) {
             var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                                        .getService(Components.interfaces.nsIIOService);
             return ioService.newURI(aURL, aOriginCharset, aBaseURI);
    }


    function showSidebar(){
        if(Config.ShowSidebar){
            document.getElementById("sideContainer").hidden = false;
            showClosed();
            showBookmarks();
        }else{
            document.getElementById("sideContainer").hidden = true;
        }
    }

    var loaded = false;

    var draw = function() {

        if (loaded)
            return;

        setBackgroundProperties();
        drawThumbs();
        showSidebar();

        //workaround for toolbar binding, XULBrowserWindow is not accessible from window, unless we do this "trick"
        if(!window.XULBrowserWindow){
          window.XULBrowserWindow = getMainXulWindow().XULBrowserWindow;
        }

        //workaround for BookmarksEventHandler
        if(!BookmarksEventHandler){
            BookmarksEventHandler = getBrowserWindow().BookmarksEventHandler;
        }

        showNotice();
        showBookmarksToolbar();

        loaded = true;
    }

    function setBackgroundProperties(){
        if(Config.BackgroundColor != ''){
            document.getElementById("mainBox").style.backgroundColor = Config.BackgroundColor;
            document.getElementById("searchBox").style.backgroundColor = Config.BackgroundColor;
        }

        if(Config.BackgroundImage != ''){
            var imageUrl = Config.BackgroundImage;
            if(!imageUrl.match(/^url\(/i)){
                imageUrl = "url(" + imageUrl + ")";
            }
            document.getElementById("mainBox").style.backgroundImage = imageUrl;
            document.getElementById("searchBox").style.backgroundImage = imageUrl;
        }
    }

    function showNotice(){
        var notificationBox = document.getElementById("notification");
        notificationBox.notificationsHidden = !Config.ShowNotice;
    }

    function showBookmarksToolbar(){
        var toolbar = document.getElementById("bookmarksBarContent_jumpstart");
        var bar = document.getElementById("bookmarksBar");
        if(Config.ShowBookmarksToolbar){
            bar.hidden = false;
            toolbar.place="place:folder=TOOLBAR";
        }else{
            bar.hidden = true;
        }
    }

    var getData = function(){
            var properties = services.AnnoService.getProperties();
            var result = properties.filter(function(element){return !element.removed;});
            result.sort(function(a,b){return a.index - b.index;});
            return result;
    }

    var moveTile = function(properties, newIndex){
        var data = getData();
        
        //check and fix index
        if(newIndex < 0){newIndex = 0;}
        if(newIndex >= data.length) {newIndex = data.length - 1;}

        var originalIndex = -1;
        var originalProperties = null;
        //find original index
        for(var i = 0; i < data.length; i++){
            if(properties.index == data[i].index){
                originalIndex = i;
                originalProperties = data[i];
                break;
            }
        }

        if(originalIndex == -1){return;}
        if(originalIndex == newIndex){return;}

        var insertIndex = newIndex;
        /*if(originalIndex < newIndex){
            insertIndex = newIndex - 1; //since we gonna remove from the list before the index
        }*/

        data.splice(originalIndex, 1);
        data.splice(insertIndex, 0, originalProperties);

        //renumber
        for(var i = 0; i < data.length; i++){
            data[i].index = i;
        }
        //update index properties
        services.AnnoService.updateProperties(data);

        mlalevic.JumpStart.TileContainerController.drawContext.data = data;
    }

    var drawThumbs = function(){
      var data = getData();
      var container = document.getElementById("siteTileContainer");

      var uiUtils = getBrowserWindow().PlacesUIUtils;
      function handleClick(){
        uiUtils.markPageAsTyped(this.href);
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

      container.draw(data, Config.Thumbs, handleClick, handlePin, handleRemoved, moveTile);
    }

    var showClosed = function(){
      if(!Config.ShowSidebar){return;}
      
        var mw = getBrowserWindow();
        var tabClosedData = mw.mlalevic.JumpStart.getClosedData();
        var undoClosed = mw.mlalevic.JumpStart.UndoClosed;

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
                  box.draw(item, utils.Binder.bindArguments(this, undoClosed, i));
              }
            }

            if(closedBox.hidden){
              closedBox.hidden = false;
              //it won't show properly closed for hidden so set timeout
              window.setTimeout(drawClosed, 0);
            }else{
                if(!loaded){ //this is to handle case when toggled from notice
                    drawClosed();
                }else{
                    window.setTimeout(drawClosed, 0);
                }
            }
        }else{
            var closedBox = document.getElementById('recentlyClosedBox');
            closedBox.hidden = true;
        }
    }

    var showBookmarks = function(){
      if(!Config.ShowSidebar){return;}

      var bookmarksData = services.BookmarksService.getLatestBookmarks(10);
    
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
            if(!loaded){
                drawItems();
            }else{
                window.setTimeout(drawItems, 0);
            }
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

    mlalevic.JumpStart.TileContainerController = {
        view : null,
        drawContext: null,
        moveHandler: null,
        setView : function(view){
            this.view = view;
        },
        content : function(){
          return this.view.getContent();
        },
        removeTiles: function(){
            var rowContainer = this.content().childNodes[0].childNodes[1];
            var rowsCount = rowContainer.childNodes.length;
            for (var i = 0; i < rowsCount; i++) {
              var row = rowContainer.childNodes[i];
              var columnsCount = row.childNodes.length;
              for (var j = 0; j < columnsCount; j++) {
                var cell = row.childNodes[j];
                while(cell.hasChildNodes()){
                    cell.removeChild(cell.firstChild);
                }
              }
            }
        },
        rearrange : function(indexFrom, indexTo){
            if(!this.drawContext){
                return;
            }

            //copy thumbs
            var thumbs = [];
            for(var i = 0; i < this.drawContext.data.length; i++){
                thumbs.push(this.drawContext.data[i]);
            }

            //double check index
            if(indexTo < 0){ indexTo = 0; }
            if(indexTo >= thumbs.length){indexTo = thumbs.length - 1;}

            //move thumb
            var moved = thumbs[indexFrom];
            thumbs.splice(indexFrom, 1);
            thumbs.splice(indexTo, 0, moved);

            //renumber
            for(var i = 0; i < thumbs.length; i++){
                thumbs[i].index = i;
            }

            var data = this.drawContext;
            this.removeTiles();
            this.drawTiles(thumbs, data.config, data.onClickHandler, data.pinHandler, data.removeHandler);
        },
        drawOriginal : function(){
            if(!this.drawContext){
                return;
            }

            var data = this.drawContext;
            var thumbs = data.data;

            //renumber
            for(var i = 0; i < thumbs.length; i++){
                thumbs[i].index = i;
            }

            this.removeTiles();
            this.drawTiles(thumbs, data.config, data.onClickHandler, data.pinHandler, data.removeHandler);
        },
        drawGrid : function(config){
            columns = config.Columns;
            rows = config.Lines;

            // Create columns
            var columnContainer = this.content().childNodes[0].childNodes[0];
            for (var i = 0; i < columns; i++)
              columnContainer.appendChild(document.createElement("column"));


            // Create rows
            var count = 0;
            var rowContainer = this.content().childNodes[0].childNodes[1];
            for (var i = 0; i < rows; i++) {

              var row = document.createElement("row");
              rowContainer.appendChild(row);
              for (var j = 0; j < columns; j++) {
                // Create tile container (drag-drop receiver)
                var cell = document.createElement("box");
                cell.setAttribute("class", config.ShowSmallThumbs?"smallTileCell": "tileCell");
                cell.index = count;
                var dragDropHandler = this.dragDropHandler;
                var ver35 = services.BrowserServices.ver35;
                if(ver35){
                    cell.addEventListener("drop", function(event){nsDragAndDrop.drop(event, dragDropHandler);}, false);
                }else{
                    cell.addEventListener("dragdrop", function(event){nsDragAndDrop.drop(event, dragDropHandler);}, false);
                }
                cell.addEventListener("dragover", function(event){nsDragAndDrop.dragOver(event, dragDropHandler);}, false);
                cell.addEventListener("draggesture", function(event){nsDragAndDrop.startDrag(event,dragDropHandler);}, false);

                cell.index = count;

                row.appendChild(cell);

                count ++;
              }
            }
        },
        draw : function(data, config, onClickHandler, pinHandler, removeHandler, moveHandler){
                this.drawContext = {
                    data: data,
                    config: config,
                    onClickHandler: onClickHandler,
                    pinHandler: pinHandler,
                    removeHandler: removeHandler
                };

                this.moveHandler = moveHandler;

                //TODO: (ML) create css class and add if data.length=0, that way we can ditch drawEmpty
                if(data.length == 0){
                    this.drawEmpty(config);
                    return;
                }

                this.drawGrid(config);

                this.drawTiles(data, config, onClickHandler, pinHandler, removeHandler);
        },
        drawTiles : function(data, config, onClickHandler, pinHandler, removeHandler){
            function translate(data) {
              let Cc = Components.classes;
              let Ci = Components.interfaces;
              var uri =          Cc["@mozilla.org/network/io-service;1"]
                                     .getService(Ci.nsIIOService)
                                     .newURI(data.url, null, null);
              var annoSvc = Cc["@mozilla.org/browser/annotation-service;1"]
                                     .getService(Ci.nsIAnnotationService);

              var faviconUrl =   Cc["@mozilla.org/browser/favicon-service;1"]
                                     .getService(Ci.nsIFaviconService)
                                     .getFaviconImageForPage(uri).spec;
              var thumbnailUrl;

              if(annoSvc.pageHasAnnotation(uri, "jumpstart/thumbs")){
                thumbnailUrl = annoSvc.getAnnotationURI(uri, "jumpstart/thumbs").spec;
              }else{
                thumbnailUrl = '';// faviconUrl;
              }

              return {
                original : data,
                uri : uri,
                host : data.host,
                url : data.url,
                title : data.title,
                fav : faviconUrl,
                originalUrl : data.originalUrl,
                thumb : thumbnailUrl
              }
            }

            var count = 0;
            var rowContainer = this.content().childNodes[0].childNodes[1];
            var rowsCount = rowContainer.childNodes.length;
            for (var i = 0; i < rowsCount; i++) {
              var row = rowContainer.childNodes[i];
              var columnsCount = row.childNodes.length;
              for (var j = 0; j < columnsCount; j++) {
                var cell = row.childNodes[j];
                if (count >= data.length){
                  return;
                }

                // Create tile
                var tile = document.createElement("vbox");
                tile.setAttribute("class", config.ShowSmallThumbs?"smallthumb":"thumb");
                cell.appendChild(tile);
                tile.draw(config, translate(data[count]), onClickHandler);
                tile.pinHandler = pinHandler;
                tile.removeHandler = removeHandler;
                tile.index = count;

                count++;
              }
            }
        },
        drawEmpty : function(config){
            this.content().childNodes[0].childNodes[2].hidden = false; //show label
            this.drawGrid(config);

            var rowContainer = this.content().childNodes[0].childNodes[1];
            var rowsCount = rowContainer.childNodes.length;
            for (var i = 0; i < rowsCount; i++) {
              var row = rowContainer.childNodes[i];
              var columnsCount = row.childNodes.length;
              for (var j = 0; j < columnsCount; j++) {
                var cell = row.childNodes[j];
                var box = document.createElement("vbox");
                box.className = "cellborder";
                cell.appendChild(box);
              }
            }
        }
    }


    //drag
    var controller = mlalevic.JumpStart.TileContainerController;
    mlalevic.JumpStart.TileContainerController.dragDropHandler =  {
          dragFinished: false,
          onDragStart: function (event, transferData, action) {
                if(!event.currentTarget || 
                   !event.currentTarget.childNodes ||
                   event.currentTarget.childNodes.length == 0){
                    return;
                }

                this.dragFinished = false;
                var handler = this;
                function dragEnded(event){
                    event.target.removeEventListener("dragend", dragEnded, false);

                    if(!handler.dragFinished){
                       controller.drawOriginal();
                    }
                }
                event.target.addEventListener("dragend", dragEnded, false);

                var tile = event.currentTarget.childNodes[0];
                var url = tile.url;
                var data = utils.Converter.toJSONString(tile.thumbData);
                transferData.data = new TransferData();
                transferData.data.addDataForFlavour("application/jumpstart", data);
                transferData.data.addDataForFlavour("text/x-moz-url", url);
                transferData.data.addDataForFlavour("text/unicode", url);
          },
          getSupportedFlavours : function () {
            var flavours = new FlavourSet();
            flavours.appendFlavour("application/jumpstart");
            //flavours.appendFlavour("text/x-moz-url");

            return flavours;
          },
          onDrop: function (event, transferData, session) {
            if(!transferData.data){
                return;
            }
            var data = utils.Converter.fromJSONString(transferData.data);
            if(!data){
                return;
            }

            this.dragFinished = true;

            controller.moveHandler(data, event.target.index);
          },
          onDragOver: function(event, flavour, session) {
            var data = this.getData(flavour, session);
            controller.rearrange(data.index, event.target.index);
          },
          getData: function(flavour, session){
              var trans = Components.classes["@mozilla.org/widget/transferable;1"].
                            createInstance(Components.interfaces.nsITransferable);
              trans.addDataFlavor(flavour.contentType);
              session.getData(trans, 0);

              var str = { }, strlen = { };
              trans.getTransferData(flavour.contentType, str, strlen);
              if (!str.value)
                return null;

              var strisupports = str.value.QueryInterface(Components.interfaces.nsISupportsString);

              var jsonData = strisupports.data;
              return utils.Converter.fromJSONString(jsonData);
          }
     }

window.addEventListener("load", Show, false);
window.addEventListener("unload", Unload, false);
})();