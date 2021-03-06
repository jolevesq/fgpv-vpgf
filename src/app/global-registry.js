/* global geoapi */
(() => {

    /**
     * These are global values defined in the RV registry. They can be overridden by creating a global `RV` object with the same properties __before__ `injector.js` is executed.
     */
    const rvDefaults = {
        dojoURL: 'http://js.arcgis.com/3.14/'
    };

    // check if the global RV registry object already extists
    if (typeof window.RV === 'undefined') {
        window.RV = {};
    }

    const RV = window.RV; // just a reference

    // apply default values to the global RV registry
    Object.keys(rvDefaults)
        .forEach(key => applyDefault(key, rvDefaults[key]));

    // initialize gapi and store a return promise
    RV.gapiPromise = geoapi(RV.dojoURL, window);

    RV.appRegistry = {};
    RV.switchLanguage = switchLanguage;
    RV.addRcsKeys = addRcsKeys;

    /***/

    /**
     * Checks if a property is already set and applies the default.
     * @param  {String} name  property name
     * @param  {String|Object|Number} value default value
     */
    function applyDefault(name, value) {
        if (typeof RV[name] === 'undefined') {
            RV[name] = value;
        }
    }

    function switchLanguage(lang) {
        Object.entries(RV.appRegistry).forEach(([id, appPromise]) => {
            appPromise.then(app => {
                app.setLanguage(lang);
            });
        });
    }

    /**
     * Add RCS layers on a given map.  Can be used after a map has already been loaded
     * @param  {String} mapId  the map to add the RCS layers to
     * @param  {Array} keys  array of RCS keys (String) to be added
     */
    function addRcsKeys(mapId, keys) {
        if (RV.appRegistry[mapId]) {
            RV.appRegistry[mapId].then(app => {
                // load the rcs keys into the map app
                app.loadRcsLayers(keys);
            });
        } else {
            console.warn('Add RCS Keys - Map id not found: ' + mapId);
        }
    }
})();
