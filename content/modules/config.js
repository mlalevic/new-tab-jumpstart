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

let EXPORTED_SYMBOLS = ["JumpstartConfiguration"];

let configChanged = "mlalevic.JumpStart.configChanged";

Components.utils.import("resource://modules/Preferences.js");
Components.utils.import("resource://modules/Observers.js");

let JumpstartPrefs = function(){
  this.prefBranch = new Preferences('mlalevic.jumpstart.');
  this.prefThumbBranch = new Preferences('mlalevic.jumpstart.thumbs.');
  this.prefBranch.addObserver(this);
};

JumpstartPrefs.prototype = {
  prefBranch : null,
  prefThumbBranch : null,
  LoadDelay : 60000,
  RefreshOnStartup : false,
  HookUpNewTab : true,
  OverrideHomepage : true,
  ShowToolbarButton : true,
  PersistThumbViewInHistory : false,
  PurgeHistoryOnThumbViewClose : true,
  ListRefresh : true,
  LogLevel : 3,
  PermanentProperties : false,
  PermanentThumbs : false,
  ShowBookmarksToolbar: true,
  ShowNotice: true,
  ShowSidebar: true,
  BackgroundColor: '',
  BackgroundImage: '',
  Thumbs : {
    ShowSmallThumbs: false,
    MinCount : 9,
    MinLines : 3,
    get MinColumns(){
      return Math.floor(this.MinCount / this.MinLines);
    },
    get Count(){
        return this.Lines * this.Columns;
    },
    Lines : 3,
    Columns : 3
  },

  Refresh : function(){
    this.LogLevel = this.prefBranch.get("LogLevel", this.LogLevel);
    this.LoadDelay = this.prefBranch.get("onstart_load_delay", this.LoadDelay);
    this.RefreshOnStartup = this.prefBranch.get("onstart_refresh", this.RefreshOnStartup);
    this.HookUpNewTab = this.prefBranch.get("hook_up_new_tab", this.HookUpNewTab);
    this.OverrideHomepage = this.prefBranch.get("show_on_startup", this.OverrideHomepage);
    this.ShowToolbarButton = this.prefBranch.get("show_toolbar_button", this.ShowToolbarButton);
    this.ListRefresh = this.prefBranch.get("list_refresh", this.ListRefresh);

    this.PermanentProperties = this.prefBranch.get("permanent_properties", this.PermanentProperties);
    this.PermanentThumbs = this.prefBranch.get("permanent_thumbs", this.PermanentThumbs);

    this.ShowBookmarksToolbar = this.prefBranch.get("show_bookmarks_toolbar", this.ShowBookmarksToolbar);
    this.ShowNotice = this.prefBranch.get("show_notice", this.ShowNotice);
    this.ShowSidebar = this.prefBranch.get("show_sidebar", this.ShowSidebar);
    this.BackgroundColor = this.prefBranch.get("bkg_color", this.BackgroundColor);
    this.BackgroundImage = this.prefBranch.get("bkg_image", this.BackgroundImage);

    this.PersistThumbViewInHistory = this.prefBranch.get("persist_in_history", this.PersistThumbViewInHistory);
    this.PurgeHistoryOnThumbViewClose = this.prefBranch.get("on_tabview_close_purge", this.PurgeHistoryOnThumbViewClose);

    this.OverrideHomepage = this.prefBranch.get("show_on_startup", this.OverrideHomepage);
    this.ShowToolbarButton = this.prefBranch.get("show_toolbar_button", this.ShowToolbarButton);

    this.Thumbs.Columns = this.prefThumbBranch.get("columns", this.Thumbs.Columns);
    this.Thumbs.Lines = this.prefThumbBranch.get("lines", this.Thumbs.Lines);

    this.Thumbs.ShowSmallThumbs = this.prefThumbBranch.get("ShowSmallThumbs", this.Thumbs.ShowSmallThumbs);
  },

  observe : function(aSubject, aTopic, data){
    // We're observing preferences only.
    if (aTopic != "nsPref:changed")
      return;
    this.Refresh();
    Observers.notify(null, configChanged, null);
  },

  setBranchPref : function(aName, aValue){
    this.prefBranch.set(aName, aValue);
  },

  getBranchPref : function(aName){
    return this.prefBranch.get(aName);
  },
  setThumbPref : function(aName, aValue){
    this.prefThumbBranch.set(aName, aValue);
  },

  getThumbPref : function(aName){
    return this.prefThumbBranch.get(aName);
  }
};


let JumpstartConfiguration = new JumpstartPrefs();
JumpstartConfiguration.Refresh();