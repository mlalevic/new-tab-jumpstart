//global prefs
pref("mlalevic.jumpstart.onstart_load_delay", 30000); //delay of refreshing thumbs at the first startup. default: 1/2 minute
pref("mlalevic.jumpstart.onstart_refresh", false); //refresh thumbnails on start of the browser
pref("mlalevic.jumpstart.hook_up_new_tab", true); //should hook up new tab
pref("mlalevic.jumpstart.show_on_startup", true); //should show on startup if the window opens homepage or blank
pref("mlalevic.jumpstart.show_toolbar_button", false); //show toolbar button

pref("mlalevic.jumpstart.LogLevel", 4); //log level - critical

pref("mlalevic.jumpstart.persist_in_history", false); //should we persist tabView in history
pref("mlalevic.jumpstart.on_tabview_close_purge", true); //if the last visited page is tabView should we purge history completely (true) or we should just remove the tabView if persist is false (false)

//thumbs prefs
//pref("mlalevic.jumpstart.thumbs.count", 9); //how many thumbs to display
pref("mlalevic.jumpstart.thumbs.columns", 3); //how many thumbs to display
pref("mlalevic.jumpstart.thumbs.lines", 3); //how many thumb lines to display
//pref("mlalevic.jumpstart.thumbs.zoom", false); //zoom thumbs on mouse over
pref("mlalevic.jumpstart.thumbs.ShowSmallThumbs", false); //show small thumbs