<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta content="width=device-width,initial-scale=1" name="viewport">
    <title>Test Definition Query - RAMP2 Viewer</title>

    <script>
        var apiHTML;
        window.definitionQueryHTML = {
            init(rampApi) {
                apiHTML = rampApi;
            },

            addLayerByUUID(uuid) {
                // only works on the legacy API for the moment
                this._RV.loadRcsLayers([uuid]);
            },

            setDefQuery(layerId, query) {
                // use RAMP filter manager to ensure everything is synchronized (map, legend, grid , ...)
                // it is not implemented in the interface yet, need a little bit of cheating
                var myMap = RAMP.mapById('mapOSDP');
                var myLayer = myMap.layers.getLayersById(layerId)[0];
                var myProxy = myLayer._layerProxy;  // cheating!
                myProxy.filter.setSql('myUniqueAppCode', query);
            },

            resetDefQuery() {
                // use RAMP filter manager to ensure everything is synchronized (map, legend, grid , ...)
                // it is not implemented in the interface yet, need a little bit of cheating
                var myMap = RAMP.mapById('mapOSDP');
                var myLayer = myMap.layers.getLayersById('powerplant100mw-naturalGas')[0];
                var myProxy = myLayer._layerProxy;  // cheating!
                myProxy.filter.setSql('myUniqueAppCode', '');
            }
        }
    </script>

    <script src="./plugins/definitionQuery/definitionQuery.js"></script>

    <% for (var index in htmlWebpackPlugin.files.css) { %>
        <% if (webpackConfig.output.crossOriginLoading) { %>
            <link rel="stylesheet" href="<%= htmlWebpackPlugin.files.css[index] %>" integrity="<%= htmlWebpackPlugin.files.cssIntegrity[index] %>" crossorigin="<%= webpackConfig.output.crossOriginLoading %>"/>
        <% } else { %>
            <link rel="stylesheet" href="<%= htmlWebpackPlugin.files.css[index] %>" />
        <% } %>
    <% } %>

    <style>
        .myMap {
            height: 80%;
        }

        input, label {
            padding: 5px;
            margin: 7px;
        }

        input {
            width: 15%;
        }
    </style>
</head>

<body>
    <div id="mapOSDP" class="myMap" id="sample-map" is="rv-map" ramp-gtm
        rv-config="config/v3-defquery-config.json"
        rv-langs='["en-CA", "fr-CA"]',
        rv-plugins="definitionQuery, definitionQueryHTML",
        rv-service-endpoint="https://rcs.open.canada.ca">
         <noscript>
            <p>This interactive map requires JavaScript. To view this content please enable JavaScript in your browser or download a browser that supports it.<p>

            <p>Cette carte interactive nécessite JavaScript. Pour voir ce contenu, s'il vous plaît, activer JavaScript dans votre navigateur ou télécharger un navigateur qui le prend en charge.</p>
        </noscript>
    </div>
    <div>
        <label for="layerId">Layer Id</label>
        <input id="layerId" type="text" name="layer" value="powerplant100mw-naturalGas"></input>
        <label for="query">Query</label>
        <input id="query" type="text" name="query" value="Longitude<-110"></input>
        <button type="button" onclick="window.definitionQueryHTML.setDefQuery(document.getElementById('layerId').value, document.getElementById('query').value)">Set def query</button>
        <button type="button" onclick="window.definitionQueryHTML.resetDefQuery()">Reset def query</button>
    </div>
    </div>
        <label for="addLayerUUID">UUID</label>
        <input id="addLayerUUID" type="text" name="layer" value="3d282116-e556-400c-9306-ca1a3cada77f"></input>
        <button type="button" onclick="window.definitionQueryHTML.addLayerByUUID(document.getElementById('addLayerUUID').value)">Add Layer</button>
        
    <div>

    <script src="./legacy-api.js"></script>

    <% for (var index in htmlWebpackPlugin.files.js) { %>
        <% if (webpackConfig.output.crossOriginLoading) { %>
            <script src="<%= htmlWebpackPlugin.files.js[index] %>" integrity="<%= htmlWebpackPlugin.files.jsIntegrity[index] %>" crossorigin="<%= webpackConfig.output.crossOriginLoading %>"></script>
        <% } else { %>
            <script src="<%= htmlWebpackPlugin.files.js[index] %>"></script>
        <% } %>
    <% } %>
</body>

</html>
