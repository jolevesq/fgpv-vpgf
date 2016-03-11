(() => {
    'use strict';

    /**
     * @ngdoc service
     * @name mapService
     * @module app.geo
     * @requires $q
     * @description
     *
     * The `mapService` factory holds references to the map dom node and the currently active map object.
     *
     */
    angular
        .module('app.geo')
        .factory('mapService', mapServiceFactory);

    function mapServiceFactory($q, gapiService, configService) {
        return geoState => mapService(geoState);

        function mapService(geoState) {
            const ref = {
                fullExtent: null // Object
            };

            // this `service` object will be exposed through `geoService`
            const service = {
                mapObject: null,
                mapManager: null, // Object

                setZoom,
                shiftZoom,
                selectBasemap,
                setFullExtent,
                zoomToGraphic,
            };

            return buildMapObject();

            /***/

            /**
             * Builds an actual esri map object
             * @return {Object} returns `service` object
             */
            function buildMapObject() {
                return configService.getCurrent()
                    .then(config => {
                        let mapObject;

                        // reset before rebuilding the map if `geoState` already has an instance of mapService
                        if (typeof geoState.mapService !== 'undefined') {
                            // NOTE: Possible to have dom listeners stick around after the node is destroyed
                            const mapService = geoState.mapService;
                            mapService.mapObject.destroy();
                            mapService.mapManager.ScalebarControl.destroy();
                            mapService.mapManager.OverviewMapControl.destroy();
                            mapService.mapObject = null;
                        }

                        // FIXME remove the hardcoded settings when we have code which does this properly
                        mapObject = gapiService.gapi.mapManager.Map(geoState.mapNode, {
                            basemap: 'gray',
                            zoom: 6,
                            center: [-100, 50]
                        });

                        // store map object in service
                        service.mapObject = mapObject;

                        if (config.services && config.services.proxyUrl) {
                            gapiService.gapi.mapManager.setProxy(config.services.proxyUrl);
                        }

                        // setup map using configs
                        // FIXME: I should be migrated to the new config schema when geoApi is updated
                        const mapSettings = {
                            basemaps: [],
                            scalebar: {},
                            overviewMap: {}
                        };

                        if (config.baseMaps) {
                            mapSettings.basemaps = config.baseMaps;
                        }

                        if (config.map.components.scaleBar) {
                            mapSettings.scalebar = {
                                attachTo: 'bottom-left',
                                scalebarUnit: 'dual'
                            };
                        }

                        if (config.map.components.overviewMap && config.map.components.overviewMap.enabled) {

                            // FIXME: overviewMap has more settings
                            mapSettings.overviewMap = config.map.components.overviewMap;
                        }

                        if (config.map.extentSets) {
                            let lFullExtent = getFullExtFromExtentSets(config.map.extentSets);

                            // map extent is not available until map is loaded
                            if (lFullExtent) {
                                gapiService.gapi.events.wrapEvents(mapObject, {
                                    load: () => {

                                        // compare map extent and setting.extent spatial-references
                                        // make sure the full extent has the same spatial reference as the map
                                        if (gapiService.gapi.proj.isSpatialRefEqual(mapObject.extent
                                                .spatialReference,
                                                lFullExtent.spatialReference)) {

                                            // same spatial reference, no reprojection required
                                            ref.fullExtent = gapiService.gapi.mapManager.getExtentFromJson(
                                                lFullExtent);
                                        } else {

                                            // need to re-project
                                            ref.fullExtent = gapiService.gapi.proj.projectEsriExtent(
                                                gapiService.gapi.mapManager.getExtentFromJson(
                                                    lFullExtent),
                                                mapObject.extent.spatialReference);
                                        }
                                    }
                                });
                            }
                        }

                        service.mapManager = gapiService.gapi.mapManager.setupMap(mapObject, mapSettings);

                        // FIXME temp link for debugging
                        window.FGPV = {
                            layers: service.layers
                        };

                        // store service in geoState
                        geoState.mapService = service;

                        return service;
                    });
            }

            /*
             * Retrieve full extent from extentSets
             * [private]
             */
            function getFullExtFromExtentSets(extentSets) {

                // FIXME: default basemap should be indicated in the config as well
                const currentBasemapExtentSetId = '123456789';

                // In configSchema, at least one extent for a basemap
                const extentSetForId = extentSets.find(extentSet => {
                    if (extentSet.id === currentBasemapExtentSetId) {
                        return true;
                    }
                });

                // no matching id in the extentset
                if (angular.isUndefined(extentSetForId)) {
                    throw new Error('could not find an extent set with matching id.');
                }

                // find the full extent type from extentSetForId
                const lFullExtent = (extentSetForId.full) ? extentSetForId.full :
                    (extentSetForId.default) ? extentSetForId.default :
                    (extentSetForId.maximum) ? extentSetForId.maximum : null;

                return lFullExtent;
            }

            /**
             * Switch basemap based on the uid provided.
             * @param {string} id identifier for a specific basemap layerbower
             */
            function selectBasemap(id) {
                const mapManager = service.mapManager;

                if (typeof mapManager === 'undefined' || !mapManager.BasemapControl) {
                    console.error('Error: Map manager or basemap control is not setup,' +
                        ' please setup map manager by calling setupMap().');
                } else {
                    mapManager.BasemapControl.setBasemap(id);
                }
            }

            /**
             * Sets zoom level of the map to the specified level
             * @param {number} value a zoom level number
             */
            function setZoom(value) {
                service.mapObject.setZoom(value);
            }

            /**
             * Changes the zoom level by the specified value relative to the current level; can be negative
             * @param  {number} byValue a number of zoom levels to shift by
             */
            function shiftZoom(byValue) {
                const map = service.mapObject;
                let newValue = map.getZoom() + byValue;
                map.setZoom(newValue);
            }

            /**
             * Set the map to full extent
             */
            function setFullExtent() {
                const map = service.mapObject;
                if (ref.fullExtent) {
                    map.setExtent(map.fullExtent);
                } else {
                    console.warn('GeoService: fullExtent value is not set.');
                }
            }

            // only handles feature layers right now. zoom to dynamic/wms layers obj won't work
            /**
             * Fetches a point in a layer given the layerUrl and objId of the object and then zooms to it
             * @param  {layerUrl} layerUrl is the URL that the point to be zoomed to belongs to
             * @param  {objId} objId is ID of object that was clicked on datatable to be zoomed to
             */
            function zoomToGraphic(layerUrl, objId) {
                const map = service.mapObject;
                const geo = gapiService.gapi.layer.getFeatureInfo(layerUrl, objId);
                geo.then(geoInfo => {
                    if (geoInfo) {
                        map.centerAndZoom(geoInfo.feature.geometry, 10);
                    }
                });
            }
        }
    }
})();