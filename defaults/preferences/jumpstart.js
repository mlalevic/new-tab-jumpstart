//global prefs
pref("mlalevic.jumpstart.onstart_load_delay", 30000); //delay of refreshing thumbs at the first startup. default: 1/2 minute
pref("mlalevic.jumpstart.onstart_refresh", false); //refresh thumbnails on start of the browser
pref("mlalevic.jumpstart.list_refresh", true); //refresh thumbs if list not full
pref("mlalevic.jumpstart.hook_up_new_tab", true); //should hook up new tab
pref("mlalevic.jumpstart.show_on_startup", true); //should show on startup if the window opens homepage or blank
pref("mlalevic.jumpstart.show_toolbar_button", false); //show toolbar button

pref("mlalevic.jumpstart.LogLevel", 4); //log level - critical

pref("mlalevic.jumpstart.persist_in_history", false); //should we persist tabView in history
pref("mlalevic.jumpstart.on_tabview_close_purge", true); //if the last visited page is tabView should we purge history completely (true) or we should just remove the tabView if persist is false (false)

pref("mlalevic.jumpstart.show_bookmarks_toolbar", false);
pref("mlalevic.jumpstart.bookmarks_toolbar_top", false);
pref("mlalevic.jumpstart.show_notice", true);
pref("mlalevic.jumpstart.show_sidebar", true);

pref("mlalevic.jumpstart.bkg_color", ""); //background color
pref("mlalevic.jumpstart.bkg_image", ""); //background image

//thumbs prefs
pref("mlalevic.jumpstart.thumbs.columns", 3); //how many thumbs to display
pref("mlalevic.jumpstart.thumbs.lines", 3); //how many thumb lines to display
pref("mlalevic.jumpstart.thumbs.ShowSmallThumbs", false); //show small thumbs
pref("mlalevic.jumpstart.permanent_properties", true); //defines whether to permanently store jumpstart properties in places db
pref("mlalevic.jumpstart.permanent_thumbs", false); //defines whether to permanently store thumbnails