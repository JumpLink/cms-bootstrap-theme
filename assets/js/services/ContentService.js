jumplink.cms.service('ContentService', function ($rootScope, $log, $sailsSocket, $filter, $modal, SortableService) {

  var showHtml = false;
  var editModal = null;

  var getShowHtml = function() {
    return showHtml;
  }

  var setEditModal = function($scope) {
    editModal = $modal({scope: $scope, title: 'Inhalt bearbeiten', template: 'editcontentmodal', show: false});
    return getEditModal();
  }

  var getEditModal = function() {
    return editModal;
  }

  var subscribe = function() {
    // called on content changes
    $sailsSocket.subscribe('content', function(msg){
      $log.debug("Content event!", msg);
      switch(msg.verb) {
        case 'updated':
          if($rootScope.authenticated) {
            $rootScope.pop('success', 'Seite wurde aktualisiert', msg.id);
          }
        break;
      }
    });
  }

  var toogleShowHtml = function(contents, cb) {
    showHtml = !showHtml;
    if(showHtml && contents) {
      contents = beautifyEach(contents);
    }
    if(cb) cb(null, showHtml);
    else return showHtml;
  }

  var beautify = function(content, cb) {
    content.content = html_beautify(content.content);
    if(cb) cb(null, content);
    else return content;
  }

  var beautifyEach = function(contents, cb) {
    for (var i = contents.length - 1; i >= 0; i--) {
      contents[i].content = beautify(contents[i].content);
    };
    if(cb) cb(null, contents);
    else return contents;
  }

  var add = function(contents, page, cb) {
    var new_index = contents.length;
    contents.push({
      position: contents[new_index-1].position+1,
      content: "",
      title: "",
      name: "",
      page: page
    });
    edit(editModal, contents[new_index], cb);
  }

  var swap = function(contents, index_1, index_2, cb) {
    return SortableService.swap(contents, index_1, index_2, cb);
  }

  var moveForward = function(index, contents, cb) {
    return SortableService.moveForward(index, contents, cb);
  }

  var moveBackward = function(index, contents, cb) {
    return SortableService.moveBackward(index, contents, cb);
  }

  var edit = function(content, cb) {
    $log.debug("edit", content);
    editModal.$scope.content = content;
    //- Show when some event occurs (use $promise property to ensure the template has been loaded)
    editModal.$promise.then(editModal.show);

    editModal.$scope.$on('modal.hide',function(){
      $log.debug("edit closed");
      cb(null, editModal.$scope.content);
    });
  }

  var removeFromClient = function (contents, index, content, cb) {
    return SortableService.remove(index, contents, cb);
  }

  var remove = function(contents, index, content, page, cb) {
    if(typeof(index) === 'undefined' || index === null) {
      index = contents.indexOf(content);
    }
    // remove from client
    contents = SortableService.remove(contents, index, content);
    // if content has an id it is saved on database, if not, not
    if(content.id) {
      $log.debug("remove from server, too" ,content);
      $sailsSocket.delete('/content/'+content.id+"?page="+page, {id:content.id, page: page}).success(function(data, status, headers, config) {
        if(cb) cb(null, contents)
      });
    }
  }

  var refresh = function(contents, cb) {
    fixEach(contents, function(err, contents) {
      if(err) {
        $log.error(err);
        if(cb) cb(err);
        else return err;
      }
      beautifyEach(contents, function(err, contents) {
        if(err) {
          $log.error(err);
          if(cb) cb(err);
          else return err;
        } else {
          if(cb) cb(null, contents);
          else return contents;
        }
      });
    });
  }

  var fix = function(content, cb) {
    if(!content.name || content.name === "") {
      // Set content.name to content.title but only the letters in lower case
      content.name = content.title.toLowerCase().replace(/[^a-z]+/g, '');
      $log.debug("set content.name to", content.name);
    }
    if(cb) cb(null, content);
    else return content;
  }

  var fixEach = function(contents, cb) {
    for (var i = contents.length - 1; i >= 0; i--) {
      contents[i] = fix(contents[i]);
    };
    if(cb) cb(null, contents);
    else return contents;
  }

  var save = function(contents, page, cb) {
    fixEach(contents, function(err, contents) {
      if(err)
        if(cb) cb(err);
        else return err;
      $sailsSocket.put('/content/replaceall', {contents: contents, page: page}).success(function(data, status, headers, config) {
        if(data != null && typeof(data) !== "undefined") {
          contents = $filter('orderBy')(data, 'position');
          $log.debug (data);
          if(cb) cb(null, contents);
        } else {
          var err = 'Seite konnte nicht gespeichert werden';
          $log.error (err);
          if(cb) cb(err);
        }
      });
    });
  }

  return {
    subscribe: subscribe,
    setEditModal: setEditModal,
    getShowHtml: getShowHtml,
    toogleShowHtml: toogleShowHtml,
    beautify: beautify,
    beautifyEach: beautifyEach,
    add: add,
    swap: swap,
    moveForward: moveForward,
    moveBackward: moveBackward,
    edit: edit,
    removeFromClient: removeFromClient,
    remove: remove,
    refresh: refresh,
    fix: fix,
    fixEach: fixEach,
    save: save
  };
});