var SelectBookmarkDialog = {
  init: function() {
    document.getElementById("bookmarks").place = window.arguments[0].place

    // Initial update of the OK button.
    this.selectionChanged();
  },

  selectionChanged: function() {
    var accept = document.documentElement.getButton("accept");
    var bookmarks = document.getElementById("bookmarks");
    var disableAcceptButton = true;
    if (bookmarks.hasSelection) {
      if (!PlacesUtils.nodeIsSeparator(bookmarks.selectedNode))
        disableAcceptButton = false;
    }
    accept.disabled = disableAcceptButton;
  },

  onItemDblClick: function() {
    var bookmarks = document.getElementById("bookmarks");
    var selectedNode = bookmarks.selectedNode;
    if (selectedNode && PlacesUtils.nodeIsURI(selectedNode)) {
      /**
       * The user has double clicked on a tree row that is a link. Take this to
       * mean that they want that link to be their homepage, and close the dialog.
       */
      document.documentElement.getButton("accept").click();
    }
  },

  /**
   * User accepts their selection. Set all the selected URLs or the contents
   * of the selected folder as the list of homepages.
   */
  accept: function() {
    var bookmarks = document.getElementById("bookmarks");

    var urls = [];
    var names = [];
    var selectedNode = bookmarks.selectedNode;
	if(!selectedNode)return;
	window.arguments[0].selection = {id : selectedNode.itemId, url: selectedNode.uri, title: selectedNode.title};
  }
};