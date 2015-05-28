jumplink.cms.service('SubnavigationService', function ($rootScope, $window, $log, $sailsSocket, $filter, $modal, SortableService) {

  var editModal = null;

  var setEditModal = function($scope) {
    editModal = $modal({scope: $scope, title: 'Navigation bearbeiten', template: 'editsubnavigationmodal', show: false});
    return getEditModal();
  }

  var getEditModal = function() {
    return editModal;
  }

  var subscribe = function() {
    // called on content changes
    $sailsSocket.subscribe('navigation', function(msg){
      $log.debug("Navigation event!", msg);
      switch(msg.verb) {
        case 'updated':
          if($rootScope.authenticated) {
            $rootScope.pop('success', 'Navigation wurde aktualisiert', msg.id);
          }
        break;
      }
    });
  }

  // WORKAROUND wait until image is loaded to fix bs-sidebar
  var resizeOnImagesLoaded = function () {
    angular.element($window).imagesLoaded(function() {
      angular.element($window).triggerHandler('resize');
    });
  }

  var add = function(navs, data, cb) {
    var new_index = navs.length;
    if(!data || !data.position) data.position = navs[new_index-1].position+1;
    if(!data || !data.target) data.target = "";
    if(!data || !data.name) data.name = "";
    if(!data || !data.page) cb("Page not set.")

    navs.push({
      position: data.position,
      target: data.target,
      name: data.name,
      page: data.page
    });

    if(cb) cb(null, navs);
    else return navs;
  }

  var swap = function(navs, index_1, index_2, cb) {
    return SortableService.swap(contents, index_1, index_2, cb);
  }

  var moveForward = function(index, navs, cb) {
    return SortableService.moveForward(index, navs, cb);
  }

  var moveBackward = function(index, navs, cb) {
    return SortableService.moveBackward(index, navs, cb);
  }

  var edit = function(navs, cb) {
    $log.debug("edit subnavigations", navs);
    editModal.$scope.navs = navs;
    //- Show when some event occurs (use $promise property to ensure the template has been loaded)
    editModal.$promise.then(editModal.show);

    editModal.$scope.$on('modal.hide',function(){
      $log.debug("edit navigation modal closed");
      cb(null, editModal.$scope.navs);
    });
  }

  var removeFromClient = function (navs, index, nav, cb) {
    if(cb) return SortableService.remove(navs, index, nav, cb);
    else return SortableService.remove(navs, index, nav);
  }

  var remove = function(navs, index, nav, page, cb) {
    if(typeof(index) === 'undefined' || index === null) {
      index = navs.indexOf(nav);
    }
    navs = removeFromClient(navs, index, nav);
    // if nav has an id it is saved on database, if not, not
    if(nav.id) {
      $log.debug("remove from server, too" ,nav);
      $sailsSocket.delete('/navigation/'+nav.id+"?page="+page, {id:nav.id, page: page}).success(function(data, status, headers, config) {
        if(cb) cb(null, navs)
      });
    }
  }

  var fix = function(fixed, object, index, cb) {
    console.log(object);
    if(typeof(object.name) !== 'undefined' && object.name && object.name !== "") {
      fixed.push(object)
    } else {
      $log.warn("Name not set, remove Subnavigation");
    }
    if(cb) cb(null, fixed);
    else return fixed;
  }

  var fixEach = function(objects, cb) {
    var fixed = [];
    for (var i = objects.length - 1; i >= 0; i--) {
      fixed = fix(fixed, objects[i], i);
    };
    if(cb) cb(null, fixed);
    else return fixed;
  }


  var save = function(navs, page, cb) {
    fixEach(navs, function(err, navs) {
      $sailsSocket.put('/navigation/replaceall', {navs: navs, page: page}).success(function(data, status, headers, config) {
        if(data != null && typeof(data) !== "undefined") {
          // WORKAROUND until socket event works
          navs = $filter('orderBy')(data, 'position');
          if(cb) cb(null, navs);
        } else {
          var err = 'Navigation konnte nicht gespeichert werden';
          $rootScope.pop('error', err, "");
          if(cb) cb(err, navs);
        }
      });
    });
  }

  return {
    resizeOnImagesLoaded: resizeOnImagesLoaded,
    subscribe: subscribe,
    setEditModal: setEditModal,
    getEditModal: getEditModal,
    add: add,
    swap: swap,
    moveForward: moveForward,
    moveBackward: moveBackward,
    edit: edit,
    removeFromClient: removeFromClient,
    remove: remove,
    save: save
  };
});