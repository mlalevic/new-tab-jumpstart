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
if (!mlalevic) {mlalevic = {};}
if (!mlalevic.JumpStart) {mlalevic.JumpStart = {};}
if (!mlalevic.JumpStart.Bookmarks) {mlalevic.JumpStart.Bookmarks = {};}

(function(){
    var services = {};
    Components.utils.import("resource://jumpstart/dbService.js", services);
    Components.utils.import("resource://jumpstart/config.js", services);
    var Config = services.JumpstartConfiguration;
    var b = services.BookmarksService;
    var limit = 20;

    var showBookmarks = function(containerId, itemsId, bookmarksData){
      var bookmarksContainer = document.getElementById(containerId);
      var bookmarksItemsContainer = document.getElementById(itemsId);
      if (!bookmarksContainer || !bookmarksItemsContainer)
        return;

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

    var showTags = function(){
        var tags = b.getTags();
        if(!tags || tags.length == 0){
            showNotice();
            return;
        }

        var tagContainer = document.getElementById('tagContainer');

        for(var i=0; i < tags.length; i++){
            addTag(tagContainer, tags[i]);
        }
    }

    var addTag = function(container, title){
        var label = document.createElement("label");
        label.className = "notselected";
        label.setAttribute("value", title);
        label.addEventListener("click", function(e){TagClicked(this);}, true);
        container.appendChild(label);
    }

    var intersect = function(arr1, arr2, compare){
        var result = [];
        for(var i = 0; i < arr1.length; i++){
            for(var j = 0; j < arr2.length; j++){
                if(compare(arr1[i], arr2[j])){
                    result.push(arr1[i]);
                    break;
                }
            }
        }
        return result;
    }

    var compareBookmarks = function(item1, item2){
        if(!item1 || !item2){
            return false;
        }
        
        return item1.url == item2.url;
    }

    var showNotice = function(){
       document.getElementById('tagnotice').hidden = false;
    }

    var showUnfiltered = function(){
        showBookmarks('latestBookmarksContainer','latestBookmarksItems', b.getLatestBookmarks(limit));
        showBookmarks('recentlyVisitedBookmarksContainer','recentlyVisitedBookmarksItems', b.getRecentlyVisitedBookmarks(limit));
        showBookmarks('frequentBookmarksContainer','frequentBookmarksItems', b.getFrequentBookmarks(limit));
    }
    
    var start = function(){
        showTags();
        showUnfiltered();
        setBackgroundProperties();
    }

    function setBackgroundProperties(){
        if(Config.BackgroundColor != ''){
            document.getElementById("mainBox").style.backgroundColor = Config.BackgroundColor;
        }

        if(Config.BackgroundImage != ''){
            var imageUrl = Config.BackgroundImage;
            if(!imageUrl.match(/^url\(/i)){
                imageUrl = "url(" + imageUrl + ")";
            }
            document.getElementById("mainBox").style.backgroundImage = imageUrl;
        }
    }

    var TagClicked = function(tag) {
        var selected = tag.className;
        tag.className = selected == 'selected' ? 'notselected' : 'selected';
        var selected = document.getElementById('tagContainer').getElementsByClassName('selected');
        var tags = Array.map(selected, function(element) { return element.value; });
        tagClicked(tags);
    }

    var tagClicked = function(tags){
        if(!tags || tags.length == 0){
            showUnfiltered();
            return;
        }

        var latest = [];
        var recent = [];
        var frequent = [];
        for(var i = 0; i< tags.length; i++){
            var l = b.getLatestByTag(limit, tags[i]);
            var r = b.getRecentlyVisitedByTag(limit, tags[i]);
            var f = b.getFrequentBookmarksByTag(limit, tags[i]);

            if(i == 0){
                latest = l; recent = r; frequent = f;
                continue;
            }

            latest = intersect(latest, l, compareBookmarks);
            recent = intersect(recent, r, compareBookmarks);
            frequent = intersect(frequent, f, compareBookmarks);
        }

        showBookmarks('latestBookmarksContainer','latestBookmarksItems', latest);
        showBookmarks('recentlyVisitedBookmarksContainer','recentlyVisitedBookmarksItems', recent);
        showBookmarks('frequentBookmarksContainer','frequentBookmarksItems', frequent);
    }

    window.addEventListener("load", start, false);

})();