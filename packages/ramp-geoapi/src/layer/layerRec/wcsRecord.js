'use strict';

const basicFC = require('./basicFC.js')();
const placeholderFC = require('./placeholderFC.js')();
const layerRecord = require('./layerRecord.js')();
const shared = require('./shared.js')();

/**
 * @class WcsRecord
 */
class WcsRecord extends layerRecord.LayerRecord {
    /**
     * Create a layer record with the appropriate geoApi layer type.  Layer config
     * should be fully merged with all layer options defined (i.e. this constructor
     * will not apply any defaults).
     * @param {Object} layerClass    the ESRI api object for image server layers
     * @param {Object} apiRef        object pointing to the geoApi. allows us to call other geoApi functions.
     * @param {Object} config        layer config values
     * @param {Object} esriLayer     an optional pre-constructed layer
     * @param {Function} epsgLookup  an optional lookup function for EPSG codes (see geoService for signature)
     */
    constructor (layerClass, apiRef, config, esriLayer, epsgLookup) {
        super(layerClass, apiRef, config, esriLayer, epsgLookup);

        // handles placeholder symbol, possibly other things
        this._defaultFC = '0';
        this._featClasses['0'] = new placeholderFC.PlaceholderFC(this, this.name);

        // TODO: if no getCap, find the way to set extent and spatial reference for WCS
        if (config.suppressGetCapabilities) {
            this.onLoad();
        }
    }

    get layerType () { return shared.clientLayerType.OGC_WCS; }

    /**
     * Creates an options object for the map API object
     *
     * @function makeLayerConfig
     * @returns {Object} an object with api options
     */
    makeLayerConfig () {
        const cfg = super.makeLayerConfig();
        cfg.version = this.config.version;
        cfg.colorMap = this.config.colorMap;

        cfg.coverages = this.config.coverages;
        cfg.currentCoverage = this.config.currentCoverage;

        cfg.pixelFilter = this._colorizer;

        if (this.config.id === 'wcsLayer2') {

          let xml =
          `<?xml version="1.0" encoding="UTF-8"?>
<CoverageDescriptions xmlns="http://www.opengis.net/wcs/1.1" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ogc="http://www.opengis.net/ogc" xsi:schemaLocation="http://www.opengis.net/wcs/1.1 http://schemas.opengis.net/wcs/1.1/wcsDescribeCoverage.xsd http://www.opengis.net/ows/1.1 http://schemas.opengis.net/ows/1.1.0/owsAll.xsd">
  <CoverageDescription>
    <ows:Title>ndvi</ows:Title>
    <ows:Abstract/>
    <Identifier>ndvi</Identifier>
    <Domain>
      <SpatialDomain>
        <ows:BoundingBox crs="urn:ogc:def:crs:OGC::imageCRS" dimensions="2">
          <ows:LowerCorner>0 0</ows:LowerCorner>
          <ows:UpperCorner>2480 1806</ows:UpperCorner>
        </ows:BoundingBox>
        <ows:BoundingBox crs="urn:ogc:def:crs:EPSG::26915" dimensions="2">
          <ows:LowerCorner>159707 4597895</ows:LowerCorner>
          <ows:UpperCorner>1400207 5501395</ows:UpperCorner>
        </ows:BoundingBox>
        <ows:WGS84BoundingBox dimensions="2">
          <ows:LowerCorner>-97.7071758865421 41.0324719184183</ows:LowerCorner>
          <ows:UpperCorner>-80.6778361148771 49.6650665681236</ows:UpperCorner>
        </ows:WGS84BoundingBox>
        <GridCRS>
          <GridBaseCRS>urn:ogc:def:crs:EPSG::26915</GridBaseCRS>
          <GridType>urn:ogc:def:method:WCS:1.1:2dSimpleGrid</GridType>
          <GridOrigin>159957 5501145</GridOrigin>
          <GridOffsets>500 -500</GridOffsets>
          <GridCS>urn:ogc:def:cs:OGC:0.0:Grid2dSquareCS</GridCS>
        </GridCRS>
      </SpatialDomain>
    </Domain>
    <Range>
      <Field>
        <Identifier>raster</Identifier>
        <Definition>
          <ows:AnyValue/>
        </Definition>
        <InterpolationMethods>
          <InterpolationMethod>bilinear</InterpolationMethod>
          <Default>nearest neighbor</Default>
        </InterpolationMethods>
        <Axis identifier="bands">
          <AvailableKeys>
            <Key>1</Key>
          </AvailableKeys>
        </Axis>
      </Field>
    </Range>
    <SupportedCRS>urn:ogc:def:crs:EPSG::26915</SupportedCRS>
    <SupportedCRS>urn:ogc:def:crs:EPSG::4269</SupportedCRS>
    <SupportedCRS>urn:ogc:def:crs:EPSG::4326</SupportedCRS>
    <SupportedFormat>image/tiff</SupportedFormat>
  </CoverageDescription>
</CoverageDescriptions>`;

          let parser = new window.DOMParser();
          let xmlDoc = parser.parseFromString(xml, 'text/xml');
          // cfg.wcsConnection = new this._apiRef.esriBundle.WcsConnection(this.config.url, { coverageId: 'ndvi', version: '1.1.2' } );
          // cfg.wcsConnection.coverages = [new this._apiRef.esriBundle.wcsCoverageDescription(xmlDoc, '1.1.2')]
        }

        if (this.config.suppressGetCapabilities) {
          cfg.extent = new this._apiRef.Map.Extent(-141, 41, -52, 83.5, {wkid: 4326}); // TODO make this a parameter post-demo
        }

        return cfg;
    }

    /**
     * Triggers when the layer loads.
     *
     * @function onLoad
     */
    onLoad () {
        const loadPromises = super.onLoad();

        const fc = new basicFC.BasicFC(this, '0', this.config);
        this._featClasses['0'] = fc;

        Promise.all(loadPromises).then(() => {
            this._stateChange(shared.states.LOADED);
        });
    }

    /**
     * Run an identify on WCS layer, return the result as a promise.
     * Options:
     * - clickEvent {Object} an event object from the mouse click event, where the user wants to identify.
     *
     * @param {Object} opts     additional arguments, see above.
     * @returns {Object} an object with identify results array and identify promise resolving when identify is complete; if an empty object is returned, it will be skipped
     */
    identify (opts) {
        // TEST TimeExtent
        const maximum = 2008;
        const minimum = 2001;
        var randomnumber = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum
        console.log(randomnumber)
        this.esriLayer.getMap().setTimeExtent(new this._apiRef.esriBundle.TimeExtent(new Date(`01/01/${randomnumber} UTC`), new Date(`01/06/${randomnumber + 4} UTC`)))
        this.esriLayer.setUseMapTime(true);

        // ignore layers not loaded, not visible, not queryable
        if (this.state === shared.states.ERROR ||
            this.state === shared.states.LOADING ||
            this.state === shared.states.NEW ||
            !this.visibility ||
            !this.isQueryable()) {
            // TODO verifiy this is correct result format if layer should be excluded from the identify process
            return { identifyResults: [], identifyPromise: Promise.resolve() };
        }

        const identifyResult = new shared.IdentifyResult(this.getProxy());

        const identifyPromise = this.esriLayer.identify(opts.clickEvent.mapPoint).then(data => {
          console.log(data.length)
            identifyResult.isLoading = false;
            identifyResult.layerId = this.layerId;
            identifyResult.layerIdx = parseInt(this._defaultFC);

            // check if a result is returned by the service. If not, do not add to the array of data
            if (data) {
                identifyResult.data.push(`Pixel value: ${data[0].attributes['Raster.ServicePixelValue']}`);
            }
        });

        return { identifyResults: [identifyResult], identifyPromise };
    }

    /**
     * A function that takes a pixelData object as input and processes it.
     *
     * @function onLoad
     */
    _colorizer(pixelData) {
        const highlightedValue = this.currentCoverage;
        const colorMap = this.colorMap;

        if (!pixelData || !pixelData.pixelBlock) {
          return;
        }

        const pixelBlock = pixelData.pixelBlock;
        const pixels = pixelBlock.pixels;
        let mask = pixelBlock.mask;
        const numPixels = pixelBlock.width * pixelBlock.height;
        if (!pixels) {
          return;
        }

        let p1 = pixels[0];
        let pr = new Uint8Array(p1.length); //set up array for red values
        let pg = new Uint8Array(p1.length); //set up array for green values
        let pb = new Uint8Array(p1.length); //set up array for blue values
        let color, i;
        if (!mask && highlightedValue === -1) {
          for (i = 0; i < numPixels; i++) {
            color = colorMap[p1[i]];
            pr[i] = color[0];  //red
            pg[i] = color[1];  //green
            pb[i] = color[2];  //blue
          }
        }
        else {
          if (mask) {
            for (i = 0; i < numPixels; i++) {
              if (mask[i]) {
                if (p1[i] === highlightedValue) {
                  color = colorMap[p1[i]];
                  pr[i] = color[0];  //red
                  pg[i] = color[1];  //green
                  pb[i] = color[2];  //blue
                }
                else {
                  mask[i] = 0;
                }
              }
            }
          }
          else {
            mask = new Uint8Array(p1.length);
            for (i = 0; i < numPixels; i++) {
              //apply color based on temperature value of each pixel
              if (p1[i] === highlightedValue) {
                color = colorMap[p1[i]];
                pr[i] = color[0];  //red
                pg[i] = color[1];  //green
                pb[i] = color[2];  //blue
                mask[i] = 1;
              }
              else {
                mask[i] = 0;
              }
            }
            pixelData.pixelBlock.mask = mask;//attach the mask
          }
        }
        pixelData.pixelBlock.pixels = [pr, pg, pb];  //assign rgb values to each pixel
        pixelData.pixelBlock.statistics = null;
        pixelData.pixelBlock.pixelType = 'U8';
    }

    /**
     * Indicates the layer is WCS based.
     *
     * @function dataSource
     * @returns {String} 'wcs' since WCS based layer
     */
    dataSource () {
        return shared.dataSources.WCS;
    }
}

module.exports = () => ({
    WcsRecord
});


// TEST CONFIG
// {
//   "id": "wcsLayer3",
//   "name": "WCS geomet",
//   "layerType": "ogcWcs",
//   "url": "https://geo.weather.gc.ca/geomet",
//   "suppressGetCapabilities": true,
//   "version": "1.1.2",
//   "corsUrl": ["https://geo.weather.gc.ca/geomet"],
//   "colorMap": [[0, 0, 255], [0, 100, 70], [0, 92, 22], [0, 143, 26], [0, 160, 70], [55, 143, 0],[117, 128, 0], [117, 128, 0], [94, 83, 0], [94, 83, 0], [74, 222, 0], [104, 104, 104],[255, 255, 155], [255, 85, 0], [135, 158, 0], [255, 255, 255], [230, 152, 0]],
//   "coverages": ["All", "Water", "Evergreen Needleleaf forest", "Evergreen Broadleaf forest", "Deciduous Needleleaf forest",
//     "Deciduous Broadleaf forest", "Mixed forest", "Closed shrublands", "Open shrublands", "Woody savannas",
//     "Savannas", "Grasslands", "Permanent wetlands", "Croplands", "Urban and built-up",
//     "Cropland/Natural vegetation mosaic", "Snow and ice", "Barren or sparsely vegetated"],
//   "controls": ["opacity", "visibility", "boundingBox", "query", "snapshot", "metadata", "boundaryZoom", "remove", "settings", "coverages"]
// }


