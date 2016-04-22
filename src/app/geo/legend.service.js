(() => {
    'use strict';

    /**
     * @ngdoc service
     * @name legendService
     * @module app.geo
     * @requires dependencies
     * @description
     *
     * The `legendService` factory constructs the legend (auto or structured). `LayerRegistry` instantiates `LegendService` providing the current config, layers and legend containers.
     * This service also scrapes layer symbology.
     *
     */
    angular
        .module('app.geo')
        .factory('legendService', legendServiceFactory);

    function legendServiceFactory($translate, $http, $q, $timeout, gapiService,
            geometryTypes, layerTypes, layerStates, legendEntryFactory) {

        const legendSwitch = {
            structured: structuredLegendService,
            autopopulate: autoLegendService
        };

        return (config, ...args) => legendSwitch[config.legend.type](config, ...args);

        /**
         * Constrcuts and maintains autogenerated legend.
         * @param  {Object} config current config
         * @param  {Object} layerRegistry instance of `layerRegistry`
         * @return {Object}        instance of `legendService` for autogenerated legend
         */
        function autoLegendService(config, layerRegistry) {
            // maps layerTypes to layer item generators
            const layerTypeGenerators = {
                esriDynamic: dynamicGenerator,
                esriFeature: featureGenerator,
                esriImage: imageGenerator,
                esriTile: tileGenerator,
                ogcWms: wmsGenerator
            };

            const service = {
                legend: legendEntryFactory.entryGroup(), // this is legend's invisible root group; to be consumed by toc

                addLayer,
                removeLayer,
                setLayerState,
                setLayerLoadingFlag
            };

            init();

            return service;

            /***/

            /**
             * Initializes autolegend by adding data and image groups to it.
             */
            function init() {
                service.legend.getLegendEntry = getLegendEntry;
            }

            /**
             * Parses a dynamic layer object and creates a legend item (with nested groups and symbology)
             * For a dynamic layer, there are two visibility functions:
             *     - `setVisibility`: https://developers.arcgis.com/javascript/jsapi/arcgisdynamicmapservicelayer-amd.html#setvisibility
             *      sets visibility of the whole layer; if this is set to false, using `setVisibleLayers` will not change anything
             *
             *  - `setVisibleLayers`: https://developers.arcgis.com/javascript/jsapi/arcgisdynamicmapservicelayer-amd.html#setvisiblelayers
             *      sets visibility of sublayers;
             *
             * A tocEntry for a dynamic layer contains subgroups and leaf nodes, each one with a visibility toggle.
             *  - User clicks on leaf's visibility toggle:
             *      toggle visibility of the leaf's layer item;
             *      notify the root group of this dynamic layer;
             *      walk root's children to find out which leaves are visible, omitting any subgroups
             *      call `setVisibleLayers` on the layer object to change the visibility of the layer
             *
             *  - User clicks on subgroup's visibility toggle:
             *      toggle visibility of the subgroup item;
             *      toggle all its children (prevent children from notifying the root when they are toggled)
             *      notify the root group of this dynamic layer;
             *      walk root's children to find out which leaves are visible, omitting any subgroups
             *      call `setVisibleLayers` on the layer object to change the visibility of the layer
             *
             *  - User clicks on root's visibility toggle:
             *      toggle all its children (prevent children from notifying the root when they are toggled)
             *      walk root's children to find out which leaves are visible, omitting any subgroups
             *      call `setVisibleLayers` on the layer object to change the visibility of the layer
             *
             * @param  {Object} layer layer object from `layerRegistry`
             * @return {Object}       legend item
             */
            function dynamicGenerator(layer) {
                const state = legendEntryFactory.dynamicEntryMasterGroup(
                    layer.initialState, layer.layer, true);
                layer.state = state;

                const symbologyPromise = getMapServerSymbology(layer);

                // wait for symbology to load and ...
                symbologyPromise
                    .then(({ data }) =>  // ... and apply them to existing child items
                        data.layers.forEach(layer => applySymbology(state.slaves[layer.layerId], layer))
                    );

                // wait on attributes to load and ...
                layer.attribs
                    .then(data =>
                        data.indexes.forEach(index =>
                            // ... assign feature counts to sublayers
                            applyFeatureCount(layer.layer.geometryType, state.slaves[index], data[index])
                        )
                    );

                // wait for attributes to load, format attributes and keep them in a promise
                const formattedAttributePromise = layer.attribs
                    .then(attributeData => layerRegistry.formatLayerAttributes(attributeData));

                // walk through child items and ...
                state.walkItems(slave => {
                    // ... make a subpromise which returns only a subset of attributes related to a sublayer
                    // and store it in the cache
                    const subPromise = formattedAttributePromise.then(formattedAttributeData =>
                        formattedAttributeData[slave.featureId]);
                    slave.setCache('attributes', subPromise);
                });

                return state;
            }

            /**
             * Parses a tile layer object and creates a legend item (with nested groups and symbology)
             * Uses the same logic as dynamic layers to generate symbology hierarchy
             * @param  {Object} layer layer object from `layerRegistry`
             * @return {Object}       legend item
             */
            function tileGenerator(layer) {
                const state = legendEntryFactory.dynamicEntryMasterGroup(
                    layer.initialState, layer.layer, true);
                layer.state = state;

                return state;
            }

            /**
             * Parses feature layer object and create a legend entry with symbology
             * @param  {Object} layer layer object from `layerRegistry`
             * @return {Object}       legend item
             */
            function featureGenerator(layer) {
                // generate toc entry
                const state = legendEntryFactory.singleEntryItem(layer.initialState, layer.layer);
                layer.state = state;

                const symbologyPromise = getMapServerSymbology(layer);

                symbologyPromise
                    .then(({ data, index }) => applySymbology(state, data.layers[index]));

                layer.attribs.then(data => {
                    applyFeatureCount(layer.layer.geometryType, state, data[data.indexes[0]]);
                });

                // store a promise to format attributes in state cache
                const formattedAttributePromise = layer.attribs
                    .then(attributeData => layerRegistry.formatLayerAttributes(attributeData))
                    .then(formattedAttributeData => formattedAttributeData[state.featureId]);

                // store formatted attribtes in cache
                state.setCache('attributes', formattedAttributePromise);

                return state;
            }

            /**
             * Parses esri image layer object and create a legend entry with symbology
             * @param  {Object} layer layer object from `layerRegistry`
             * @return {Object}       legend item
             */
            function imageGenerator(layer) {
                // generate toc entry
                const state = legendEntryFactory.singleEntryItem(layer.initialState, layer.layer);
                layer.state = state;

                return state;
            }

            /**
             * Parses WMS layer object and create a legend entry with symbology
             * @param  {Object} layer layer object from `layerRegistry`
             * @return {Object}       legend item
             */
            function wmsGenerator(layer) {
                const state = legendEntryFactory.singleEntryItem(layer.initialState, layer.layer);
                state.symbology = gapiService.gapi.layer.ogc
                    .getLegendUrls(layer.layer, state.layerEntries.map(le => le.id))
                    .map((url, idx) => {
                        return { name: state.layerEntries[idx].name || state.layerEntries[idx].id, icon: url };
                    });
                layer.state = state;

                return state;
            }

            /**
             * Add a provided layer to the appropriate group;
             *
             * TODO: hide groups with no layers;
             * @param {Object} layer object from `layerRegistry` `layers` object
             */
            function addLayer(layer) {
                const layerType = layer.initialState.layerType;
                const entry = layerTypeGenerators[layerType](layer);

                // layerTypeGroups[layerType].add(entry);
                service.legend.add(entry);
            }

            /**
             * Removes a provided layer from the appropriate group.
             * @param {Object} layer object from `layerRegistry` `layers` object
             */
            function removeLayer(layer) {
                layerTypeGroups[layer.state.layerType].remove(layer.state);
            }

            /**
             * Sets state of the layer entry: error, default, out-of-scale, etc
             * @param {Object} layer layer object from `layerRegistry`
             * @param {String} state defaults to `default`; state name
             * @param {Number} delay defaults to 0; delay before setting the state
             */
            function setLayerState(layer, state = layerStates.default, delay = 0) {
                /*const legendEntry = layer.state;

                // same as with map loading indicator, need timeout since it's a non-Angular async call
                $timeout.cancel(legendEntry.stateTimeout);
                legendEntry.stateTimeout = $timeout(() => {
                    legendEntry.state = state;*/

                    /*switch (state) {
                        case: layerStates
                    }*/
                //}, delay);
            }

            /**
             * Sets `isLoading` flag on the legend entry.
             * @param {Object} layer layer object from `layerRegistry`
             * @param {Boolean} isLoading defaults to true; flag indicating if the layer is updating their content
             * @param {Number} delay defaults to 0; delay before setting the state
             */
            function setLayerLoadingFlag(layer, isLoading = true, delay = 0) {
                const legendEntry = layer.state;

                // same as with map loading indicator, need timeout since it's a non-Angular async call
                $timeout.cancel(legendEntry.loadingTimeout);
                legendEntry.loadingTimeout = $timeout(() => {
                    legendEntry.isLoading = isLoading;
                }, delay);
            }

            /**
             * Finds and returns a legend entry object with the specified id.
             * @param  {Number} id
             * @return {Object}    legend entry object
             */
            function getLegendEntry(id) {
                let result;

                service.legend.items.forEach(entryGroup => {
                    entryGroup.walkItems(item => {
                        if (item.id === id) {
                            result = item;
                        }
                    }, true); // true is important here as we want to test entry groups as well
                });

                return result;
            }
        }

        // TODO: maybe this should be split into a separate service; it can get messy otherwise in here
        function structuredLegendService() {

        }

        /**
         * TODO: Work in progress... Works fine for feature layers only right now; everything else gest a generic icon;
         * TODO: move to geoapi as it's stateless and very specific
         * Scrapes feaure and dynamic layers for their symbology;
         *
         * * data.layers [
         *     {
         *         layerId: Number,
         *         legend: Array
         *     },
         *     ...
         * ]
         * @param  {Object} layer layer object from `layerRegistry`
         */
        function getMapServerSymbology(layer) {
            const reg = /(.+?)(\/(\d))?$/; // separate layer id from the rest of the url
            const url = layer.state.url.replace(/\/+$/, ''); // strip trailing slashes

            // jscs also doesn't like fancy destructuring
            // jscs:disable requireSpaceAfterComma
            const [, legendUrl,, index = -1] = reg.exec(url); // https://babeljs.io/docs/learn-es2015/#destructuring
            // jscs:enable requireSpaceAfterComma

            return $http.jsonp(`${legendUrl}/legend?f=json&callback=JSON_CALLBACK`)
                .then(result => {
                    // console.log(legendUrl, index, result);

                    if (result.data.error) {
                        return $q.reject(result.data.error);
                    }
                    return {
                        data: result.data,
                        index
                    };
                })
                .catch(error => {
                    // TODO: apply default symbology to the layer in question in this case
                    console.error(error);
                });
        }

        /**
         * Applies feature count to the toc entries.
         * @param  {String} geometryType one of geometry types
         * @param  {Object} state legend entry object
         * @param  {Object} data  layer attributes
         */
        function applyFeatureCount(geometryType, state, data) {
            state.features.count = data.features.length;
            $translate(geometryTypes[geometryType]).then(type =>
                state.features.type = type.split('|')[state.features.count > 1 ? 1 : 0]);
        }

        /**
         * Applies retrieved symbology to the layer item's state
         * @param  {Object} state     layer item
         * @param  {Object} layerData data from the legend endpoint
         */
        function applySymbology(state, layerData) {
            state.symbology = layerData.legend.map(item => {
                return {
                    icon: `data:${item.contentType};base64,${item.imageData}`,
                    name: item.label
                };
            });
        }
    }
})();
