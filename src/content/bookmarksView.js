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

if (!mlalevic.Utils) {
    mlalevic.Utils = {};
}

if (!mlalevic.JumpStart) {
  mlalevic.JumpStart = {};
}

if (!mlalevic.JumpStart.Bookmarks) {
  mlalevic.JumpStart.Bookmarks = {};
}

(function() {

  var bindingHelper = function() {
  }

  bindingHelper.prototype = {
    queryId: null,
    templatedId: null,
    defaultQuery: null,
    parametrizedQuery: null,
    _prepareQuery: function(parameters) {
      var result = this.parametrizedQuery;
      for (var p in parameters) {
        result = result.replace('{' + p + '}', parameters[p]);
      }
      return result;
    },
    _getTagsParams: function(tags) {
      var result = '';
      for (var i = 0; i < tags.length; i++) {
        if (i != 0) {
          result += ',';
        }

        result += "'" + tags[i] + "'";
      }
      return result;
    },
    refresh: function(tags) {
      var query = document.getElementById(this.queryId);
      var template = document.getElementById(this.templatedId);

      if (!tags || tags.length == 0) {
        query.textContent = this.defaultQuery;
      } else {
        query.textContent = this._prepareQuery({ tags: this._getTagsParams(tags), count: tags.length });
      }

      template.builder.rebuild();
    }
  }

  bindingHelper.Init = function(p) {
    var b = new bindingHelper();
    b.queryId = p['q'];
    b.templatedId = p['t'];
    b.defaultQuery = p['q1'];
    b.parametrizedQuery = p['q2'];
    return b;
  }

  bindingHelper.InitAll = function(p) {
    var b = [];
    for (var i = 0; i < p.length; i++) {
      b.push(bindingHelper.Init(p[i]));
    }
    return b;
  }

  var latestQuery =
    "select case b.title when '' then p.url else b.title end as title, p.url as url " +
    '{extension} ' +
    'join moz_places p on b.fk = p.id ' +
     'where b.type = 1 and b.parent not in ( ' +
                'select a.item_id ' +
                'from moz_anno_attributes n ' +
                'join moz_items_annos a on n.id = a.anno_attribute_id ' +
                "where n.name in ('livemark/feedURI', 'placesInternal/READ_ONLY' )) " +
    "and p.rev_host <> '' " +
    'order by b.dateAdded desc ' +
    'limit 30';

  var recentQuery =
    "select case b.title when '' then p.url else b.title end as title, p.url as url " +
    '{extension} ' +
    'join moz_places p on b.fk = p.id ' +
    'join ' +
    '  (select h.place_id as pid, max(visit_date) as dt from moz_historyvisits h ' +
    '    group by h.place_id ' +
    '   ) h ' +
    '   on p.id = h.pid ' +
    'where b.type = 1 and b.parent not in ( ' +
                'select a.item_id ' +
                'from moz_anno_attributes n ' +
                'join moz_items_annos a on n.id = a.anno_attribute_id ' +
                "where n.name in ('livemark/feedURI', 'placesInternal/READ_ONLY' )) " +
    "and p.rev_host <> '' " +
    'order by h.dt desc ' +
    'limit 30';

  var frequentQuery =
    "select case b.title when '' then p.url else b.title end as title, p.url as url " +
    '{extension} ' +
    'join moz_places p on b.fk = p.id ' +
    'where b.type = 1 and b.parent not in ( ' +
                'select a.item_id ' +
                'from moz_anno_attributes n ' +
                'join moz_items_annos a on n.id = a.anno_attribute_id ' +
                "where n.name in ('livemark/feedURI', 'placesInternal/READ_ONLY' )) " +
    "and p.rev_host <> '' " +
    'order by p.frecency desc ' +
    'limit 30';

  var noTagQueryExtension = 'from moz_bookmarks b ';

  var tagQueryExtension =
    'from (select b.fk as fk ' +
          'from moz_bookmarks_roots r ' +
          'join moz_bookmarks tagsRoot on r.folder_id = tagsRoot.id ' +
          'join moz_bookmarks tags on tagsRoot.id = tags.parent ' +
          'join moz_bookmarks b on b.parent = tags.id ' +
          "where r.root_name = 'tags' and tags.title in ({tags}) " +
          'group by b.fk ' +
          'having count(b.fk) = {count}) as br ' + //br - places that have been tagged by all selected tags
          'join moz_bookmarks b on b.fk = br.fk ' + //we get all the bookmarks + all tagged entries so we need to remove tagged entries 
  //(that is to get real title)
          ' and b.parent not in ' +                 //so we do the removal
            '(select tags.id as id ' +              // this select returns all the tags and we're removing all entries that have them for parents
               'from moz_bookmarks_roots r ' +
               'join moz_bookmarks tagsRoot on r.folder_id = tagsRoot.id ' +
               'join moz_bookmarks tags on tagsRoot.id = tags.parent ' +
               "where r.root_name = 'tags') ";

  function defaultQ(query) {
    return query.replace('{extension}', noTagQueryExtension);
  }

  function parametrizedQ(query) {
    return query.replace('{extension}', tagQueryExtension);
  }


  var bindings = bindingHelper.InitAll([
      { q: 'qlatest', t: 'tlatest', q1: defaultQ(latestQuery), q2: parametrizedQ(latestQuery) },
      { q: 'qrecent', t: 'trecent', q1: defaultQ(recentQuery), q2: parametrizedQ(recentQuery) },
      { q: 'qfrequent', t: 'tfrequent', q1: defaultQ(frequentQuery), q2: parametrizedQ(frequentQuery) }
    ]);


  mlalevic.JumpStart.Bookmarks.TagClicked = function(tag) {
    var selected = tag.getAttribute('class');
    tag.setAttribute('class', selected == 'selected' ? 'notselected' : 'selected');
    var selected = document.getElementById('tags').getElementsByClassName('selected');
    var tags = Array.map(selected, function(element) { return element.getAttribute('value'); });
    for (var i = 0; i < bindings.length; i++) {
      bindings[i].refresh(tags);
    }
  }

  mlalevic.JumpStart.Bookmarks.Loaded = function() {
    if (document.getElementById('tags').getElementsByTagName('li').length == 0) {
      document.getElementById('tagnotice').hidden = false;
    }
  }

  mlalevic.JumpStart.Bookmarks.FollowAsBookmark = function(anchor) {
    PlacesUIUtils.markPageAsFollowedBookmark(anchor.href);
  }

})();