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

    mlalevic.JumpStart.onMenuItemThumbs = function(){
        document.getElementById("siteTileContainer").enterEdit();
    }

    mlalevic.JumpStart.onMenuItemToolbar = function(){
        toolbar.enterEdit();
    }

    mlalevic.JumpStart.invertPrefValue = function(aName){
      Config.setBranchPref(aName, !(Config.getBranchPref(aName)));
    }

    mlalevic.JumpStart.toggleShowStatusbarButton = function(){
        mlalevic.JumpStart.invertPrefValue("show_statusbar_button");
    }

    mlalevic.JumpStart.toggleBookmarksToolbar = function(){
        mlalevic.JumpStart.invertPrefValue("show_bookmarks_toolbar");
        showBookmarksToolbar();
    }


    var highlightAnimation = null;
    var preHighlightColor = null;

    mlalevic.JumpStart.highlightMenu = function(){
    var target = document.getElementById('slideMenu');
        if(preHighlightColor == null){
                preHighlightColor = target.style.borderColor;
        }
        var color = preHighlightColor;
        var altColor = 'Red';
        var count = 0;
        if(highlightAnimation){
                window.clearInterval(highlightAnimation);
                target.style.borderColor = preHighlightColor;
        }

        highlightAnimation = window.setInterval(function(){
                if(count >= 10){
                        window.clearInterval(highlightAnimation);
                        target.style.borderColor = color;
                        return;
                }

                target.style.borderColor = count%2==0?altColor:color;
                count++;
        }, 200);
    }


    mlalevic.JumpStart.toggleSidebar = function(){
        mlalevic.JumpStart.invertPrefValue("show_sidebar");
        showSidebar();
    }

    mlalevic.JumpStart.releaseNotes = function(){
        Config.setBranchPref("show_notice", false);
        window.location = "http://www.new-tab-jumpstart.com/releases";
    }

    mlalevic.JumpStart.hideNotice = function(){
        Config.setBranchPref("show_notice", false);
        var notification = document.getElementById("whatsNew");
        if(notification){
            notification.hidden = true;
        }
    }

    mlalevic.JumpStart.allFeatures = function(){
        Config.setBranchPref("show_notice", false);
        window.location = "http://www.new-tab-jumpstart.com/features";
    }

    mlalevic.JumpStart.focusSearch = function(){
        focusSearch();
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
        var bro = getMyBrowser();
        var internalHistory = bro.sessionHistory.QueryInterface(Components.interfaces.nsISHistoryInternal);
        return new mlalevic.Utils.HistoryUtility(internalHistory);
    }

    function getGBrowser(){
        return getBrowserWindow().gBrowser;
    }

    function getMyBrowser(){
        return getGBrowser().getBrowserForDocument(document);
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

    var focusSearch = function(){
        document.getElementById('search-box').focus();
    }

    const KEY_UP = 40;
    const KEY_DOWN = 38;

    function expandSearch(e){
        if(e.which == KEY_UP || e.which == KEY_DOWN){
            return;
        }

        expandSearchElement(this, this.value.length > 0);
    }

    function expandSearchOnArrows(e){
        if(e.which == KEY_UP || e.which == KEY_DOWN){
            expandSearchElement(this, true);
        }
    }

    function expandSearchElement(el, expand){
        if(expand)
            el.parentNode.parentNode.style.marginLeft = '-' + Config.ExpandSearchPixels + 'px';
        else
            el.parentNode.parentNode.style.marginLeft = '0px';
    }

    var wireUpSearch = function(){
        document.getElementById('search-box').addEventListener("keyup", expandSearch, false);
        document.getElementById('search-box').addEventListener("keydown", expandSearchOnArrows, false);
    }

    var aSlide = null;
    var newToolbars = false;

    if(getBrowserWindow().PlacesViewBase){
        newToolbars = true;
        //var PlacesViewBase = getBrowserWindow().PlacesViewBase;

        function CustomPlacesToolbar(aPlace, parent) {
          // Add some smart getters for our elements.
          let thisView = this;
          [
            ["_viewElt",              "PlacesToolbar"],
            ["_rootElt",              "PlacesToolbarItems"],
            ["_dropIndicator",        "PlacesToolbarDropIndicator"],
            ["_chevron",              "PlacesChevron"],
            ["_chevronPopup",         "PlacesChevronPopup"]
          ].forEach(function (elementGlobal) {
            let [name, id] = elementGlobal;
            thisView.__defineGetter__(name, function () {
              let element = document.getAnonymousElementByAttribute(parent, 'anonid', id);
              if (!element)
                return null;

              delete thisView[name];
              return thisView[name] = element;
            });
          });

          this._viewElt._placesView = this;

          this._addEventListeners(this._viewElt, this._cbEvents, false);
          this._addEventListeners(this._rootElt, ["popupshowing", "popuphidden"], true);
          this._addEventListeners(this._rootElt, ["overflow", "underflow"], true);
          this._addEventListeners(window, ["resize", "unload"], false);

          PlacesViewBase.call(this, aPlace);
        }

        CustomPlacesToolbar.prototype = PlacesToolbar.prototype;//getBrowserWindow().PlacesToolbar.prototype;
    }

    var Show = function() {
        /*topDial.clearUrlBarForOurTab();
        topDial.registerForUpdate(Dial.showClosed);*/
        utils.Observers.add(showClosed, dataRefreshEvent);
        utils.Observers.add(showBookmarks, bookmarksChangedEvent);
        draw();
        if(Config.FocusOnSearch){focusSearch();}
        positionMenu();
        aSlide = new showDown('slideMenu');
        wireUpSearch();
        closeSearchNotice();

        prepareEditMenu();
    }

    function prepareEditMenu(){
        let placesContext = document.getElementById("placesContext");
        placesContext.addEventListener("popupshowing", function(){goUpdateGlobalEditMenuItems();}, false);
        placesContext.addEventListener("popuphiding", function(){goUpdateGlobalEditMenuItems();}, false);
    }

    function closeSearchNotice(){
        var nb = getBrowserWindow().getNotificationBox(window);
        var n = nb.getNotificationWithValue('jumpstart_searchnotice');
        if(n){n.close();}
    }

    function positionMenu(){
        var target = document.getElementById('slideMenu');
        var width = document.defaultView.getComputedStyle(target, null).getPropertyValue('width', null);
        var contentwidth = document.defaultView.getComputedStyle(document.getElementById('theDeck'), null).getPropertyValue('width', null);
        var left = parseInt(contentwidth.replace('px', '')) - parseInt(width.replace('px', '')) - 10;
        target.style.left = left + 'px';
        target.left = left + 'px';
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
        if(!toolbar) toolbar = new toolbarHandler();
        
        toolbar.reDraw();
    }

    function toolbarHandler(){
            this.topBar = document.getElementById("bookmarksBarTop");
            this.bottomBar = document.getElementById("bookmarksBarBottom");
            this.resetPlaces();
    }

    toolbarHandler.prototype = {
            topBar : null,
            bottomBar : null,
            topPlaces : [],
            bottomPlaces : [],
            editMode : false,
            resetPlaces : function(){
                    this.topPlaces = this.getPlaces(Config.TopToolbars);
                    this.bottomPlaces = this.getPlaces(Config.BottomToolbars);
            },
            getPlaces : function(places){
                    var data = places.split("\n");
                    return data.filter(function(element){ return (true && element);});
            },
            createToolbar : function(place, editMode, removeAction){
                    var box = document.createElement('vbox');
                    box.setAttribute('class', 'bookmarksBar');
                    var stack = document.createElement('stack');
                    stack.setAttribute('flex', '1');

                    if(newToolbars){
                        var tlbr = document.createElement('hbox');
                        tlbr.setAttribute('flex', '1');
                        tlbr.setAttribute('class', 'bookmarksToolbar');
                        stack.appendChild(tlbr);
                        window.setTimeout(function(){new CustomPlacesToolbar(place, tlbr)}, 0);
                    }
                    else
                    {
                        var tlbr = document.createElement('hbox');
                        tlbr.setAttribute('flex', '1');
                        tlbr.setAttribute('type', 'places');
                        tlbr.setAttribute('context', 'placesContext');
                        tlbr.setAttribute('onclick', "BookmarksEventHandler.onClick(event);");
                        tlbr.setAttribute('oncommand', "BookmarksEventHandler.onCommand(event);");
                        tlbr.setAttribute('onpopupshowing', "BookmarksEventHandler.onPopupShowing(event);");
                        tlbr.setAttribute('tooltip', "btTooltip");
                        tlbr.setAttribute('place', place);

                        stack.appendChild(tlbr);
                    }

                    if(editMode){
                            var opacity = document.createElement('hbox');
                            opacity.setAttribute('flex', '1');
                            opacity.setAttribute('style', 'background-color:red; opacity: .5');

                            var actions = document.createElement('hbox');
                            actions.setAttribute('flex', '1');
                            actions.setAttribute('style', 'background-color:transparent;');

                            var b = document.createElement('toolbarbutton');
                            b.setAttribute('label', '');
                            b.setAttribute('class', 'removetoolbarbutton');
                            b.addEventListener('command', removeAction, true);
                            actions.appendChild(b);

                            stack.appendChild(opacity);
                            stack.appendChild(actions);
                    }
                    box.appendChild(stack);
                    return box;
            },
            showToolbars : function(bar, config){
                var toolbar = this;
                    for(var i = 0; i < config.length; i++){
                            //utils.Binder.bindArguments(this, undoClosed, i)
                            var child = this.createToolbar(config[i], this.editMode,
                                    (function(index){return function(){
                                        config.splice(index, 1);
                                        toolbar.reDraw();
                                        };
                                    })(i)
                            );
                            bar.appendChild(child);
                    }
            },
            clearToolbars : function(bar){
                    while(bar.hasChildNodes()){
                            bar.removeChild(bar.firstChild);
                    }
            },
            reDraw : function(){
                    this.clearToolbars(this.topBar);
                    this.clearToolbars(this.bottomBar);
                    if(Config.ShowBookmarksToolbar || this.editMode){
                        this.showToolbars(this.topBar, this.topPlaces);
                        this.showToolbars(this.bottomBar, this.bottomPlaces);
                    }

                    if(this.editMode){
                            this.showControls();
                    }
            },
            showPlacesPicker: function(){
                    var rv = { selection : null, place: 'place:queryType=1&excludeItems=true&folder=PLACES_ROOT' };
                    window.openDialog("chrome://jumpstart/content/placeSelect.xul", '', 'resizable,modal', rv).focus();
                    if(rv.selection)
                            return rv.selection.url;

                    return null;
            },
            showControls: function(){
                    var toolbar = this;
                    var cancelFunction = function(){
                            toolbar.resetPlaces();
                            toolbar.exitEdit();
                    };
                    var acceptFunction = function(){
                            Config.setBranchPref('top_toolbars', toolbar.topPlaces.join("\n"));
                            Config.setBranchPref('bottom_toolbars', toolbar.bottomPlaces.join("\n"));
                            if(toolbar.topPlaces.length > 0 || toolbar.bottomPlaces.length > 0){
                                Config.setBranchPref("show_bookmarks_toolbar", true);
                            }
                            toolbar.exitEdit();
                    };
                    this.topBar.insertBefore(this.createControlBox(
                            function(){
                                    var place = toolbar.showPlacesPicker();
                                    if(place){
                                            place = place.replace('&excludeItems=1', '').replace('&excludeItems=true', ''); //so we show bookmarks and folders
                                            toolbar.topPlaces.push(place);
                                            toolbar.reDraw();
                                    }
                            },
                            cancelFunction,
                            acceptFunction
                    ), this.topBar.firstChild);

                    this.bottomBar.insertBefore(this.createControlBox(
                            function(){
                                    var place = toolbar.showPlacesPicker();
                                    if(place){
                                            place = place.replace('&excludeItems=1', '').replace('&excludeItems=true', ''); //so we show bookmarks and folders
                                            toolbar.bottomPlaces.push(place);
                                            toolbar.reDraw();
                                    }
                            },
                            cancelFunction,
                            acceptFunction
                    ), this.bottomBar.firstChild);
            },
            createControlBox : function(addFunction, cancelFunction, acceptFunction){
                    var box = document.createElement('hbox');
                    box.setAttribute('class', 'bookmarksBarControlBox');

                    var add = document.createElement('toolbarbutton');
                    add.setAttribute('label', '');
                    add.setAttribute('class', 'addtoolbar');
                    add.addEventListener('command', addFunction, true);
                    box.appendChild(add);

                    var apply = document.createElement('toolbarbutton');
                    apply.setAttribute('label', '');
                    apply.setAttribute('class', 'applytoolbar');
                    apply.addEventListener('command', acceptFunction, true);
                    box.appendChild(apply);

                    var cancel = document.createElement('toolbarbutton');
                    cancel.setAttribute('label', '');
                    cancel.setAttribute('class', 'canceltoolbar');
                    cancel.addEventListener('command', cancelFunction, true);
                    box.appendChild(cancel);

                    return box;
            },
            enterEdit : function(){
                    this.editMode = true;
                    this.reDraw();
            },
            exitEdit : function(){
                    this.editMode = false;
                    this.reDraw();
            }
    }

    var toolbar = null;

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

    var uiUtils = getBrowserWindow().PlacesUIUtils;

    var drawThumbs = function(){
      var data = getData();
      var container = document.getElementById("siteTileContainer");

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

      var bookmarksData = services.BookmarksService.getLatestBookmarks(Config.RecentBookmarksCount);
    
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
          box.setAttribute("flex", "1");
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
      document.getElementById('theDeck').selectedIndex = 0;
    }

    //copied from browser.js
    function convertFromUnicode(charset, str)
    {
      try {
        var unicodeConverter = Components
           .classes["@mozilla.org/intl/scriptableunicodeconverter"]
           .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        unicodeConverter.charset = charset;
        str = unicodeConverter.ConvertFromUnicode(str);
        return str + unicodeConverter.Finish();
      } catch(ex) {
        return null;
      }
    }

    //copied from browser.js
    function getShortcutOrURI(aURL, aPostDataRef) {
      var shortcutURL = null;
      var keyword = aURL;
      var param = "";
      var searchService = Cc["@mozilla.org/browser/search-service;1"].
                          getService(Ci.nsIBrowserSearchService);

      var offset = aURL.indexOf(" ");
      if (offset > 0) {
        keyword = aURL.substr(0, offset);
        param = aURL.substr(offset + 1);
      }

      if (!aPostDataRef)
        aPostDataRef = {};

      var engine = searchService.getEngineByAlias(keyword);
      if (engine) {
        var submission = engine.getSubmission(param, null);
        aPostDataRef.value = submission.postData;
        return submission.uri.spec;
      }

      [shortcutURL, aPostDataRef.value] =
        PlacesUtils.getURLAndPostDataForKeyword(keyword);

      if (!shortcutURL)
        return aURL;

      var postData = "";
      if (aPostDataRef.value)
        postData = unescape(aPostDataRef.value);

      if (/%s/i.test(shortcutURL) || /%s/i.test(postData)) {
        var charset = "";
        const re = /^(.*)\&mozcharset=([a-zA-Z][_\-a-zA-Z0-9]+)\s*$/;
        var matches = shortcutURL.match(re);
        if (matches)
          [, shortcutURL, charset] = matches;
        else {
          // Try to get the saved character-set.
          try {
            // makeURI throws if URI is invalid.
            // Will return an empty string if character-set is not found.
            charset = PlacesUtils.history.getCharsetForURI(makeURI(shortcutURL));
          } catch (e) {}
        }

        var encodedParam = "";
        if (charset)
          encodedParam = escape(convertFromUnicode(charset, param));
        else // Default charset is UTF-8
          encodedParam = encodeURIComponent(param);

        shortcutURL = shortcutURL.replace(/%s/g, encodedParam).replace(/%S/g, param);

        if (/%s/i.test(postData)) // POST keyword
          aPostDataRef.value = getPostDataStream(postData, param, encodedParam,
                                                 "application/x-www-form-urlencoded");
      }
      else if (param) {
        // This keyword doesn't take a parameter, but one was provided. Just return
        // the original URL.
        aPostDataRef.value = null;

        return aURL;
      }

      return shortcutURL;
    }

    function tryGetUrlForKeyword(url){
        var postData = {};
        var newUrl = getShortcutOrURI(url, postData);

        if(newUrl == url){
            return [null, null];
        }else{
            return [newUrl, postData.value];
        }
    }

    //copied from browser.js
    function addToUrlbarHistory(aUrlToAdd) {
       if (aUrlToAdd &&
        aUrlToAdd.indexOf(" ") == -1 &&
        !/[\x00-\x1F]/.test(aUrlToAdd)){
          try{
            uiUtils.markPageAsTyped(aUrlToAdd);
          }catch(ex){
            services.Logger.error("Error setting page typed " + aUrlToAdd, ex.message);
          }
       }
    }

    mlalevic.JumpStart.historySearch = function(aInput) {
      var newUri = null;
      var postData = null;
      [newUri, postData] = tryGetUrlForKeyword(aInput);
      if(newUri){
          getMyBrowser().loadURI(newUri, null, postData, false);
          return;
      }


      //http://stackoverflow.com/questions/161738/what-is-the-best-regular-expression-to-check-if-a-string-is-a-valid-url
      var httpregex = /^(https?|ftp):\/\//i;
      var aboutregex = /^about:/i;
      var urlregex= /^((https?|ftp):\/\/)?(([a-z0-9$_\.\+!\*\'\(\),;\?&=-]|%[0-9a-f]{2})+(:([a-z0-9$_\.\+!\*\'\(\),;\?&=-]|%[0-9a-f]{2})+)?@)?((([a-z0-9][a-z0-9-]*[a-z0-9]\.)+[a-z][a-z0-9-]*[a-z0-9]|((\d|[1-9]\d|1\d{2}|2[0-4][0-9]|25[0-5])\.){3}(\d|[1-9]\d|1\d{2}|2[0-4][0-9]|25[0-5]))(:\d+)?)(((\/+([a-z0-9$_\.\+!\*\'\(\),;:@&=-]|%[0-9a-f]{2})*)*(\?([a-z0-9$_\.\+!\*\'\(\),;:@&=-]|%[0-9a-f]{2})*)?)?)?(#([a-z0-9$_\.\+!\*\'\(\),;:@&=-]|%[0-9a-f]{2})*)?$/i;
      if(httpregex.test(aInput) || aboutregex.test(aInput) || urlregex.test(aInput)){
          if(!httpregex.test(aInput)){
              if(!aboutregex.test(aInput)){
                aInput = 'http://' + aInput; //assume http
              }
          }
          getGBrowser().userTypedValue = aInput;
          addToUrlbarHistory(aInput);
          document.location = aInput; //maybe should use loadURI
          return;
      }
      //TODO: handle 404 - and revert back to search

      showSearchNotice(aInput);
      showDefaultSearch(aInput);
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
        drawOriginal : function(redrawGrid){
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
            if(redrawGrid) this.drawGrid(data.config);
            this.drawTiles(thumbs, data.config, data.onClickHandler, data.pinHandler, data.removeHandler);
        },
        drawGrid : function(config){
            columns = config.Columns;
            rows = config.Lines;

            var columnContainer = this.content().childNodes[0].childNodes[0];
            var count = 0;
            var rowContainer = this.content().childNodes[0].childNodes[1];

            //clear first
            while(columnContainer.hasChildNodes()){
                    columnContainer.removeChild(columnContainer.firstChild);
            }
            while(rowContainer.hasChildNodes()){
                    rowContainer.removeChild(rowContainer.firstChild);
            }

            // Create columns
            for (var i = 0; i < columns; i++)
              columnContainer.appendChild(document.createElement("column"));


            // Create rows
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
        drawForConfig : function(config){
            if(!this.drawContext)return;

            this.drawGrid(config);
            var d = this.drawContext;
            var data = d.data;

            if(data.length < config.Count){
                    //copy array
                    data = data.map(function(e){return e;});
                    while(data.length < config.Count){
                            data.push({ url: 'http://', title: '', fav: '', host: '', thumb: '' });
                    }
            }
            this.drawTiles(data, config, d.onClickHandler, d.pinHandler, d.removeHandler);
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



     function the_search(engineName, searchText, useNewTab) {
            var ss = Components.classes["@mozilla.org/browser/search-service;1"].
                     getService(Components.interfaces.nsIBrowserSearchService);

            var engine = ss.getEngineByName(engineName);
            if(!engine)return;
            var submission = engine.getSubmission(searchText, null); // HTML response

            // getSubmission can return null if the engine doesn't have a URL
            // with a text/html response type.  This is unlikely (since
            // SearchService._addEngineToStore() should fail for such an engine),
            // but let's be on the safe side.
            if (!submission)
              return;

            if (useNewTab) {
              getGBrowser().loadOneTab(submission.uri.spec, null, null,
                                  submission.postData, null, false);
            } else
              getMyBrowser().loadURI(submission.uri.spec, null, submission.postData, false);
          }

          function showDefaultSearch(searchText){
            var ss = Components.classes["@mozilla.org/browser/search-service;1"].
                 getService(Components.interfaces.nsIBrowserSearchService);

            var engine = ss.currentEngine;

            if(!engine)return;
            var submission = engine.getSubmission(searchText, null); // HTML response

            // getSubmission can return null if the engine doesn't have a URL
            // with a text/html response type.  This is unlikely (since
            // SearchService._addEngineToStore() should fail for such an engine),
            // but let's be on the safe side.
            if (!submission)
              return;

            getMyBrowser().loadURI(submission.uri.spec, null, submission.postData, false);
          }

          function showSearchNotice(searchTerm){
            if(!searchTerm)return;

            var nb = getBrowserWindow().getNotificationBox(window);
            var n = nb.getNotificationWithValue('jumpstart_searchnotice');
            if(!n){
                nb.appendNotification('', 'jumpstart_searchnotice',
                                         'chrome://jumpstart/skin/img/JumpStart32.png',
                                         nb.PRIORITY_INFO_HIGH, []);
                n = nb.getNotificationWithValue('jumpstart_searchnotice');

                var p = n.ownerDocument.getAnonymousElementByAttribute(n, 'anonid', 'details');

                var b = n.ownerDocument.createElement("hbox"); // create a new XUL menuitem
                b.setAttribute('flex', '1');
                b.setAttribute('align', 'center');
                var img = n.ownerDocument.createElement('image');
                img.setAttribute('src', 'chrome://jumpstart/skin/img/JumpStart32.png');
                img.setAttribute('class', 'messageImage');
                b.appendChild(img);

                var bx = n.ownerDocument.createElement('hbox');
                bx.setAttribute('style', '-moz-binding: url("chrome://jumpstart/content/bindings/thumbnail.xml#searchEngines");');
                bx.setAttribute('term', searchTerm);
                bx.setAttribute('flex', '1');
                b.appendChild(bx);

                p.parentNode.replaceChild(b, p);
            }

            n.persistence = Config.PersistSearchNotice;
          }

window.addEventListener("load", Show, false);
window.addEventListener("unload", Unload, false);


        var HIDDEN = 0;
        var EXTENDING = 1;
        var RETRACTING = 2;
        var SHOWN = 3;

        function showDown(targetId){
            this.target = document.getElementById(targetId);
            this.init();
        }

        showDown.prototype = {
            state : HIDDEN,
            target: null,
            height: 0,
            step: Config.SlideStep,
            speed: Config.SlideSpeed,
            initialyShown: 10,
            currentLoop : null,
            init : function(){
                //services.Logger.info("Init");
                var height = document.defaultView.getComputedStyle(this.target, null).getPropertyValue('height', null);
                this.height = height.substring(0, height.length - 2);
                this.currentMargin = this.initialyShown - this.height;
                this.hookMouseOver();
                this.update();
            },
            change : function(){
                //services.Logger.info("change", this.state);
                switch(this.state){
                    case HIDDEN:
                        break;
                    case EXTENDING:
                        this.unhookMouseOver();
                        this.hookMouseOut();
                        this.initSlide();
                        break;
                    case RETRACTING:
                        this.hookMouseOver();
                        this.unhookMouseOut();
                        this.initSlide();
                        break;
                    case SHOWN:
                        break;
                }
                this.update();
            },
            hookMouseOver: function(){
                //services.Logger.info("hookover", this.state);
                var obj = this;
                this.mouseoverhandler = function(){obj.onmouseover();};
                this.target.addEventListener("mouseover", this.mouseoverhandler, true);
            },
            unhookMouseOver:function(){
                //services.Logger.info("unhookover", this.state);
                this.target.removeEventListener("mouseover", this.mouseoverhandler, true);
            },
            hookMouseOut:function(){
               //services.Logger.info("hookout", this.state);
               var obj = this;
               this.mouseouthandler = function(){obj.onmouseout();};
               this.target.addEventListener("mouseout", this.mouseouthandler, true);
            },
            unhookMouseOut:function(){
                //services.Logger.info("unhookout", this.state);
                this.target.removeEventListener("mouseout", this.mouseouthandler, true);
            },
            onmouseover: function(){
                //services.Logger.info("onmouse over", this.state);
                this.state = EXTENDING;
                this.change();
            },
            onmouseout: function(){
                //services.Logger.info("onmouse out", this.state);
                this.state = RETRACTING;
                this.change();
            },
            stop : function(){
                //services.Logger.info("stop", this.currentInterval);
                if(this.currentInterval)
                    window.clearInterval(this.currentInterval);
                this.currentInterval = null;
            },
            initSlide: function(){
                //services.Logger.info("init slide", this.state);
                this.stop();
                var obj = this;
                var cnt = 0;
                var doSlide = function(end){
                    if(obj.currentMargin == end){
                        obj.onFinishedMove();
                        return;
                    }

                    switch(obj.state){
                        case EXTENDING:
                            obj.currentMargin += obj.step;
                            if(obj.currentMargin > end) obj.currentMargin = end;
                            break;
                        case RETRACTING:
                            obj.currentMargin -= obj.step;
                            if(obj.currentMargin < end) obj.currentMargin = end;
                            break;
                    }
                    obj.update();
                };

                switch(this.state){
                    case EXTENDING:
                        this.currentInterval = window.setInterval(doSlide, this.speed, 0);
                        break;
                    case RETRACTING:
                        this.currentInterval = window.setInterval(doSlide, this.speed, this.initialyShown - this.height);
                        break;
                }
            },
            onFinishedMove: function(){
                //services.Logger.info("finished move", this.state);
                this.stop();
                switch(this.state){
                    case EXTENDING:
                        this.state = SHOWN;
                        break;
                    case RETRACTING:
                        this.state = HIDDEN;
                        break;
                }
                this.change();
            },
            update : function(){
                //services.Logger.info("updated", this.state);
                this.target.style.marginTop = this.currentMargin + 'px';
            }
        }

})();