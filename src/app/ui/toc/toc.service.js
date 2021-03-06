(() => {
    'use strict';

    /**
     * @ngdoc service
     * @name tocService
     * @module app.ui.toc
     *
     * @description
     * The `tocService` service provides bindable layer data to the `TocController`'s template.
     *
     * __Lots of hardcoded sample config data.__
     *
     */
    angular
        .module('app.ui.toc')
        .factory('tocService', tocService);

    function tocService($timeout, $q, $rootScope, $mdToast, layoutService, stateManager,
        geoService, metadataService) {
        // TODO: remove after switching to the real config
        // jscs:disable maximumLineLength
        const service = {
            // method called by the options and flags set on the layer item
            actions: {
                toggleLayerGroup,
                toggleLayerFiltersPanel
            }
        };

        // toc preset controls (options and flags displayed on the layer item)
        // TODO: move presets to a constant service
        service.presets = {
            groupOptions: {
                visibility: {
                    action: null,
                    icon: {
                        on: 'action:visibility',
                        off: 'action:visibility_off',
                        zoomIn: 'action:zoom_in',
                        zoomOut: 'action:zoom_out'
                    },
                    label: 'toc.label.toggleGroupViz',
                    tooltip: 'toc.tooltip.toggleGroupViz'
                }
            },
            options: {
                extra: {
                    icon: 'navigation:more_horiz',
                    label: 'toc.label.extraMenu',
                    tooltip: 'toc.tooltip.extraMenu'
                },
                metadata: {
                    icon: 'action:description',
                    label: 'toc.label.metadata',
                    tooltip: 'toc.tooltip.metadata',
                    action: toggleMetadata
                },
                query: {
                    icon: 'communication:location_on',
                    label: 'toc.label.query',
                    tooltip: 'toc.tooltip.query'
                },
                settings: {
                    icon: 'image:tune',
                    label: 'toc.label.settings',
                    tooltip: 'toc.tooltip.settings',
                    action: toggleSettings
                },
                visibility: {
                    icon: {
                        on: 'action:visibility',
                        off: 'action:visibility_off',
                        zoomIn: 'action:zoom_in',
                        zoomOut: 'action:zoom_out'
                    },
                    label: {
                        off: 'toc.label.visibility.off',
                        on: 'toc.label.visibility.on',
                        zoomIn: 'toc.label.visibility.zoomIn',
                        zoomOut: 'toc.label.visibility.zoomOut'
                    },
                    tooltip: {
                        off: 'toc.tooltip.visibility.off',
                        on: 'toc.tooltip.visibility.on',
                        zoomIn: 'toc.tooltip.visibility.zoomIn',
                        zoomOut: 'toc.tooltip.visibility.zoomOut'
                    },
                    action: toggleVisiblity
                },
                reload: {
                    icon: 'navigation:refresh',
                    label: 'toc.label.reload',
                    tooltip: 'toc.tooltip.reload'
                },
                remove: {
                    icon: 'action:delete',
                    label: 'toc.label.remove',
                    tooltip: 'toc.tooltip.remove',
                    action: removeLayer
                },
                filters: {
                    icon: '',
                    label: 'toc.label.filters',
                    tooltip: 'toc.tooltip.filters'
                }
            },
            flags: {
                type: {
                    icon: {
                        esriFeature: 'community:vector-square',
                        esriDynamic: 'action:settings',
                        esriDynamicLayerEntry: 'image:photo',
                        ogcWms: 'image:photo',
                        ogcWmsLayerEntry: 'image:photo',
                        esriImage: 'image:photo',
                        esriTile: 'image:photo'
                    },
                    label: {
                        esriFeature: 'toc.label.flag.feature',
                        esriDynamic: 'toc.label.flag.dynamic',
                        esriDynamicLayerEntry: 'toc.label.flag.dynamic',
                        ogcWms: 'toc.label.flag.wms',
                        ogcWmsLayerEntry: 'toc.label.flag.wms',
                        esriImage: 'toc.label.flag.image',
                        esriTile: 'toc.label.flag.tile'
                    },
                    tooltip: {
                        esriFeature: 'toc.tooltip.flag.feature',
                        esriDynamic: 'toc.tooltip.flag.dynamic',
                        esriDynamicLayerEntry: 'toc.tooltip.flag.dynamic',
                        ogcWms: 'toc.tooltip.flag.wms',
                        ogcWmsLayerEntry: 'toc.tooltip.flag.wms',
                        esriImage: 'toc.tooltip.flag.image',
                        esriTile: 'toc.label.flag.tile'
                    }
                },
                scale: {
                    icon: 'action:info',
                    label: 'toc.label.flag.scale',
                    tooltip: 'toc.tooltip.flag.scale'
                },
                data: {
                    icon: {
                        table: 'community:table-large',
                        filter: 'community:filter'
                    },
                    label: {
                        table: 'toc.label.flag.data.table',
                        filter: 'toc.label.flag.data.filter'
                    },
                    tooltip: {
                        table: 'toc.tooltip.flag.data.table',
                        filter: 'toc.tooltip.flag.data.filter'
                    }
                },
                query: {
                    icon: 'community:map-marker-off',
                    label: 'toc.label.flag.query',
                    tooltip: 'toc.tooltip.flag.query'
                },
                user: {
                    icon: 'social:person',
                    label: 'toc.label.flag.user',
                    tooltip: 'toc.tooltip.flag.user'
                }
            },
            state: {
                icon: {
                    error: 'alert:error',
                    reloading: 'navigation:refresh'
                },
                label: {
                    error: 'toc.label.state.error',
                    reloading: 'toc.label.state.loading'
                },
                tooltip: {
                    error: 'toc.tooltip.state.error',
                    reloading: 'toc.tooltip.state.loading'
                }
            }
        };

        // jscs:enable maximumLineLength

        const selectedLayerLog = {};

        // set state change watches on metadata, settings and filters panel
        watchPanelState('sideMetadata', 'metadata');
        watchPanelState('sideSettings', 'settings');
        watchPanelState('filtersFulldata', 'filters');

        return service;

        /**
         * Simple function to remove layers.
         * Hides the layer data and removes the node from the layer selector; removes the layer from
         * @param  {Object} entry layerItem object from the `legendService`
         */
        function removeLayer(entry) {
            const isEntryVisible = entry.getVisibility();
            const entryParent = entry.parent;

            // pretend we removed the layer by setting it's visibility to off and remove it from the layer selector
            entry.setVisibility(false);
            const entryPosition = entryParent.remove(entry);

            // create notification toast
            const undoToast = $mdToast.simple()
                .textContent('Layer removed') // TODO: translate
                .action('undo') // TODO: translate
                .highlightAction(true)
                .parent(layoutService.panes.toc)
                .position('bottom rv-flex');

            $mdToast.show(undoToast)
                .then(response => {
                    if (response === 'ok') { // promise resolves with 'ok' when user clicks 'undo'
                        // restore layer visibility on undo; and add it back to layer selector
                        entryParent.add(entry, entryPosition);

                        // restore original visibility, so if he removed and restored already invisible layer,
                        // it is restored also invisible
                        entry.setVisibility(isEntryVisible);
                    } else {
                        // remove layer for real now
                        geoService.removeLayer(entry.id);
                    }
                });
        }

        // TODO: rename to something like `setVisibility` to make it clearer what this does
        // if 'value' is not specified, toggle
        function toggleVisiblity(tocEntry, value) {
            console.log('Toggle visiblity of layer: ' + tocEntry.name);
            tocEntry.setVisibility(value);
        }

        // temp function to open layer groups
        function toggleLayerGroup(group) {
            console.log('toggle layer group', group.name);
            group.expanded = !group.expanded;
        }

        /**
         * Opens settings panel with settings from the provided layer object.
         * // FIXME: opens the same settings right now.
         * @param  {Object} entry layer object whose settings should be opened.
         */
        function toggleSettings(entry) {
            const requester = {
                id: entry.id
            };

            const panelToClose = {
                filters: false
            };

            stateManager
                .setActive(panelToClose)
                .then(() => stateManager.toggleDisplayPanel('sideSettings', entry, requester));
        }

        /**
         * Opens filters panel with data from the provided layer object.
         * @param  {Object} layer layer object whose data should be displayed.
         */
        function toggleLayerFiltersPanel(layer) {
            const requester = {
                id: layer.id,
                name: layer.name
            };

            // wait for attributes to be loaded, then process them into grid format
            const dataPromise = geoService.layers[layer.id].attribs.then(attribBundle => {
                let layerId = layer.id;
                let layerIdx;

                // FIXME: remove default ecogeo data once filters is disabled for layers with no attribs.
                //        can get rid of the layerId and layerIdx vars to (they are used to support the hack)
                if (attribBundle.indexes.length === 0) {
                    layerId = 'ecogeo';
                    layerIdx = '0';
                } else {
                    // FIXME once the TOC has layer indexes assigned to its elements, and available to
                    //       the button that triggers the grid view, we should be using that.  for now,
                    //       hack by grabbing the first index available (.indexes[0])
                    layerIdx = attribBundle.indexes[0];
                }

                return geoService.getFormattedAttributes(layerId, layerIdx);
            }).then(attrs => {
                return {
                    data: {
                        // TODO remove .isNumber stuff once proper table support is completed
                        columns: attrs.columns.slice(0, ((angular.isNumber(layer.id) ? layer.id : 0) + 1) *
                            5),
                        data: attrs.data.slice(0, ((angular.isNumber(layer.id) ? layer.id : 0) + 1) * 50),

                        // FIXME: this after dynamic layer index gets refactored to proper separate layers
                        featureIndex: '0'
                    },
                    isLoaded: false
                };
            });

            stateManager.setActive({
                other: false
            });
            stateManager
                .setActive({
                    side: false
                })
                .then(() => stateManager.toggleDisplayPanel('filtersFulldata', dataPromise, requester, 0));
        }

        /**
         * Opens metadata panel with data from the provided layer object.
         * // FIXME: generates some garbage text instead of proper metadata
         * @param  {Object} entry layer object whose data should be displayed.
         */
        function toggleMetadata(entry) {
            const requester = {
                id: entry.id
            };
            const panelToClose = {
                filters: false
            };

            // if a sublayer of a group, select its root
            const layer = entry.master ? entry.master : entry;

            // construct a temp promise which resolves when data is generated or retrieved;
            const dataPromise = $q(fulfill => {
                // check if metadata is cached
                if (layer.cache.metadata) {
                    fulfill(layer.cache.metadata);
                } else {

                    const xmlUrl = layer.metadataUrl;

                    // TODO: xsl should come from service constant? or is this layer specific
                    // following is a test xsl from RAMP, should be updated for FGPV
                    const xslUrl = 'http://ramp-pcar.github.io/demos/NRSTC/v5.4.2/ramp-pcar/' +
                        'assets/metadata/xstyle_default_en.xsl';

                    // TODO: need to handle errors
                    // transform xml
                    metadataService.transformXML(xmlUrl, xslUrl).then(mdata => {

                        // result is wrapped in an array due to previous setup
                        // TODO: chagee the following when changing associated directive service
                        layer.cache.metadata = [mdata[0].innerText];
                        fulfill(layer.cache.metadata);
                    });
                }
            });

            stateManager
                .setActive(panelToClose)
                .then(() => stateManager.toggleDisplayPanel('sideMetadata', dataPromise, requester));
        }

        /**
         * Sets a watch on StateManager for layer data panels. When the requester is changed, calls setTocEntrySelectedState to dehighlight layer options and checks the state of the layer item itself (selected / not selected).
         *
         * @param  {String} panelName    name of the panel to watch as specified in the stateManager
         * @param  {String} displayName type of the display data (layer toggle name: 'settings', 'metadata', 'filters')
         */
        function watchPanelState(panelName, displayName) {
            // clear display on metadata, settings, and filters panels when closed
            $rootScope.$on('stateChangeComplete', (event, name, property, value) => {
                // console.log(name, property, value);
                if (property === 'active' && name === panelName && value === false) {
                    stateManager.clearDisplayPanel(panelName);
                }
            });

            $rootScope.$watch(() => stateManager.display[displayName].requester, (newRequester, oldRequester) => {
                if (newRequester !== null) {
                    // deselect layer from the old requester if layer ids don't match
                    if (oldRequester !== null && oldRequester.id !== newRequester.id) {
                        setTocEntrySelectedState(oldRequester.id, false);
                    }

                    // select the new layer
                    setTocEntrySelectedState(newRequester.id);
                } else if (oldRequester !== null) {
                    // deselect the old layer since the panel is closed as the newRequester is null
                    setTocEntrySelectedState(oldRequester.id, false);
                }
            });
        }

        /**
         * Sets selected state of the toc entry with the specified id to the specified value
         * @param {Stromg} id    toc entry id; it can be different from a layer id (sublayers of a dynamic layer will have generated ids)
         * @param {Boolean} value defaults to true;
         */
        function setTocEntrySelectedState(id, value = true) {
            const entry = geoService.legend.getLegendEntry(id);
            if (entry) {
                // toc entry is considered selected if its metadata, settings, or data panel is opened;
                // when switching between panels (opening metadata when settings is already open), events may happen out of order
                // to ensure a toc entry is not deselected untimely, keep count of open/close events
                selectedLayerLog[id] = (selectedLayerLog[id] || 0) + (value ? 1 : -1);
                entry.selected = selectedLayerLog[id] > 0 ? true : false;
            }
        }
    }
})();
