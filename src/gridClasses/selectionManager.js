﻿// Class that manages all row selection logic
// @options - {
//      selectedItems - an observable array to keep in sync w/ the selected rows
//      selectedIndex - an observable to keep in sync w/ the index of the selected data item
//      data - (required) the observable array data source of data items
//  }
//


var module = angular.module('ngGrid.services', []);

module.factory('SelectionManagerService', ['$scope', function($scope) {
    var SelectionManagerService = {};	
		
	SelectionManagerService.initialize = function(options, rowManager){
		$scope.isMulti = options.isMulti || options.isMultiSelect;
        $scope.ignoreSelectedItemChanges = false; // flag to prevent circular event loops keeping single-select observable in sync
        $scope.dataSource = options.data, // the observable array datasource
        $scope.KEY = '__ng_selected__', // constant for the selection property that we add to each data item,
        $scope.ROW_KEY = '__ng_rowIndex__', // constant for the entity's rowCache rowIndex
        		
		$scope.selectedItem = options.selectedItem || undefined; 
		$scope.selectedItems = options.selectedItems || []; 
		$scope.selectedIndex = options.selectedIndex; 
		$scope.lastClickedRow = options.lastClickedRow; 
		$scope.rowManager = rowManager;
		
		// some subscriptions to keep the selectedItem in sync
		$scope.$watch($scope.selectedItem, function (val) {
			if ($scope.ignoreSelectedItemChanges)
				return;
			$scope.selectedItems = [val];
		});
		
		$scope.$watch($scope.selectedItems, function (vals) {
			$scope.ignoreSelectedItemChanges = true;
			$scope.selectedItem = vals ? vals[0] : null;
			$scope.ignoreSelectedItemChanges = false;
		});
		
		// ensures our selection flag on each item stays in sync
		$scope.$watch($scope.selectedItems, function (newItems) {
			var data = $scope.dataSource;
			if (!newItems) {
				newItems = [];
			}
			angular.forEach(data, function (item, i) {
				if (!item[KEY]) {
					item[KEY] = false;
				}
				if (ng.utils.arrayIndexOf(newItems, item) > -1) {
					//newItems contains the item
					item[$scope.KEY] = true;
				} else {
					item[$scope.KEY] = false;
				}
			});
		});		
		
		//make sure as the data changes, we keep the selectedItem(s) correct
		$scope.$watch($scope.dataSource, function (items) {
			var selectedItems,
				itemsToRemove;
			if (!items) {
				return;
			}
			
			//make sure the selectedItem(s) exist in the new data
			selectedItems = $scope.selectedItems;
			itemsToRemove = [];

			angular.forEach(selectedItems, function (item) {
				if (ng.utils.arrayIndexOf(items, item) < 0) {
					itemsToRemove.push(item);
				}
			});

			//clean out any selectedItems that don't exist in the new array
			if (itemsToRemove.length > 0) {
				$scope.selectedItems.removeAll(itemsToRemove);
			}
		});
		
		// writable-computed observable
		// @return - boolean indicating if all items are selected or not
		// @val - boolean indicating whether to select all/de-select all
		$scope.toggleSelectAll = {
			get: function () {
				var cnt = $scope.selectedItemCount;
				if ($scope.maxRows() === 0) {
					return false;
				}
				return cnt === $scope.maxRows();
			},
			set: function (val) {
				var checkAll = val,
				dataSourceCopy = [];
				angular.forEach(dataSource, function (item) {
					dataSourceCopy.push(item);
				});
				if (checkAll) {
					$scope.selectedItems = dataSourceCopy;
				} else {
					$scope.selectedItems = [];
				}
			}
		}
	}	
	
	// the count of selected items (supports both multi and single-select logic
    $scope.selectedItemCount = function () {
        return $scope.selectedItems.length;
    }
	
	$scope.maxRows = function () {
	   return $scope.dataSource.length;
	};
		
	// function to manage the selection action of a data item (entity)
    SelectionManagerService.changeSelection = function (rowItem, evt) {
        if ($scope.isMulti && evt && evt.shiftKey) {
            if($scope.lastClickedRow) {
                var thisIndx = $scope.rowManager.rowCache.indexOf(rowItem);
                var prevIndx = $scope.rowManager.rowCache.indexOf($scope.lastClickedRow);
                if (thisIndx == prevIndx) return;
                prevIndx++;
                if (thisIndx < prevIndx) {
                    thisIndx = thisIndx ^ prevIndx;
                    prevIndx = thisIndx ^ prevIndx;
                    thisIndx = thisIndx ^ prevIndx;
                }
                for (; prevIndx <= thisIndx; prevIndx++) {
                    $scope.rowManager.rowCache[prevIndx].selected = $scope.lastClickedRow.selected;
                    $scope.addOrRemove(rowItem);
                }
                $scope.lastClickedRow(rowItem);
                return true;
            }
        } else if (!isMulti) {
            rowItem.selected ? $scope.selectedItems = [rowItem.entity] : $scope.selectedItems = [];
        }      
        $scope.addOrRemove(rowItem);
        $scope.lastClickedRow(rowItem);
        return true;
    }
	
	// just call this func and hand it the rowItem you want to select (or de-select)    
    SelectionManagerService.addOrRemove = function(rowItem) {
        if (!rowItem.selected) {
            $scope.selectedItems.remove(rowItem.entity);
        } else {
            if ($scope.selectedItems.indexOf(rowItem.entity) === -1) {
                $scope.selectedItems.push(rowItem.entity);
            }
        }
    };
	
	return SelectionManagerService;
}]);
   
   
//knockout starts   
ng.selectionManager = function (options, rowManager) {
    var self = this,
        isMulti = options.isMulti || options.isMultiSelect,
        ignoreSelectedItemChanges = false, // flag to prevent circular event loops keeping single-select observable in sync
        dataSource = options.data, // the observable array datasource
        KEY = '__ng_selected__', // constant for the selection property that we add to each data item,
        ROW_KEY = '__ng_rowIndex__', // constant for the entity's rowCache rowIndex
        maxRows = (function () {
            return dataSource.length;
        })();
        
    this.selectedItem = options.selectedItem || undefined; 
    this.selectedItems = options.selectedItems || []; 
    this.selectedIndex = options.selectedIndex; 
    this.lastClickedRow = options.lastClickedRow; 
    
    // some subscriptions to keep the selectedItem in sync
    this.selectedItem.$watch(function (val) {
        if (ignoreSelectedItemChanges)
            return;
        self.selectedItems = [val];
    });
    this.selectedItems.$watch(function (vals) {
        ignoreSelectedItemChanges = true;
        self.selectedItem(vals ? vals[0] : null);
        ignoreSelectedItemChanges = false;
    });
    
    // function to manage the selection action of a data item (entity)
    this.changeSelection = function (rowItem, evt) {
        if (isMulti && evt && evt.shiftKey) {
            if(self.lastClickedRow) {
                var thisIndx = rowManager.rowCache.indexOf(rowItem);
                var prevIndx = rowManager.rowCache.indexOf(self.lastClickedRow);
                if (thisIndx == prevIndx) return;
                prevIndx++;
                if (thisIndx < prevIndx) {
                    thisIndx = thisIndx ^ prevIndx;
                    prevIndx = thisIndx ^ prevIndx;
                    thisIndx = thisIndx ^ prevIndx;
                }
                for (; prevIndx <= thisIndx; prevIndx++) {
                    rowManager.rowCache[prevIndx].selected = self.lastClickedRow.selected;
                    self.addOrRemove(rowItem);
                }
                self.lastClickedRow(rowItem);
                return true;
            }
        } else if (!isMulti) {
            rowItem.selected ? self.selectedItems = [rowItem.entity] : self.selectedItems = [];
        }      
        self.addOrRemove(rowItem);
        self.lastClickedRow(rowItem);
        return true;
    }

    // just call this func and hand it the rowItem you want to select (or de-select)    
    this.addOrRemove = function(rowItem) {
        if (!rowItem.selected) {
            self.selectedItems.remove(rowItem.entity);
        } else {
            if (self.selectedItems.indexOf(rowItem.entity) === -1) {
                self.selectedItems.push(rowItem.entity);
            }
        }
    };
    
    // the count of selected items (supports both multi and single-select logic
    this.selectedItemCount = (function () {
        return self.selectedItems.length;
    })();

    // ensures our selection flag on each item stays in sync
    this.selectedItems.$watch(function (newItems) {
        var data = dataSource;

        if (!newItems) {
            newItems = [];
        }

        angular.forEach(data, function (item, i) {

            if (!item[KEY]) {
                item[KEY] = false;
            }

            if (ng.utils.arrayIndexOf(newItems, item) > -1) {
                //newItems contains the item
                item[KEY] = true;
            } else {
                item[KEY] = false;
            }

        });
    });

    // writable-computed observable
    // @return - boolean indicating if all items are selected or not
    // @val - boolean indicating whether to select all/de-select all
    this.toggleSelectAll = {
        get: function () {
            var cnt = self.selectedItemCount;
            if (maxRows() === 0) {
                return false;
            }
            return cnt === maxRows();
        },
        set: function (val) {
            var checkAll = val,
            dataSourceCopy = [];
            angular.forEach(dataSource, function (item) {
                dataSourceCopy.push(item);
            });
            if (checkAll) {
                self.selectedItems = dataSourceCopy;
            } else {

                self.selectedItems = [];

            }
        }
    };

    //make sure as the data changes, we keep the selectedItem(s) correct
    $watch(dataSource, function (items) {
        var selectedItems,
            itemsToRemove;
        if (!items) {
            return;
        }
        
        //make sure the selectedItem(s) exist in the new data
        selectedItems = self.selectedItems;
        itemsToRemove = [];

        angular.forEach(selectedItems, function (item) {
            if (ng.utils.arrayIndexOf(items, item) < 0) {
                itemsToRemove.push(item);
            }
        });

        //clean out any selectedItems that don't exist in the new array
        if (itemsToRemove.length > 0) {
            self.selectedItems.removeAll(itemsToRemove);
        }
    });
};  