import { QueueScheduler } from "../../../../node_modules/rxjs/internal/scheduler/QueueScheduler";

/**
 * @module sliderService
 * @memberof app.ui
 * @description
 *
 * The `sliderService` is ...
 *
 */
angular
    .module('app.ui')
    .factory('sliderService', sliderService);

function sliderService($rootScope, events, $filter, $timeout) {

    const service = {
        initSlider,
        stepSlider,
        refreshSlider,
        lock,
        setRange,
        addLayer,
        getLayer,
        getLayers,
        setActiveLayer,
        toggleSetting,
        toggleHisto,
        isSettingOpen: true,
        isHistoOpen: true,
        limits: {
            min: 0,
            max: 0,
            number: { min: 0, max: 0 },
            date: { min: 0, max: 0 }
        },
        slider: {},
        layersName: {}
    };

    let layers =[];
    let activeLayer;
    let activeType;

    init();

    return service;

    /************/

    function init() {
        $rootScope.$on('slideEnded', () => {
            setDefQuery();
        });
    }

    // Category has been remove for now
    // function initSliderCategory(interval, min = null, max = null) {

    //     getStats(interval, min, max).then(stats => {
    //         service.limits.min = 'QC';
    //         service.limits.max = 'MB';

    //         service.slider = {
    //             lock: true,
    //             minValue: 'QC',
    //             maxValue: 'MB',
    //             options: {
    //                 stepsArray:['QC', 'ON', 'NB', 'MB'],
    //                 noSwitching: true,
    //                 showTicks: true,
    //                 draggableRange: true,
    //                 enforceStep: true
    //             }
    //         };
    //     });

    //     // set handles WCAG
    //     setwcagHandles();
    // }

    function initSlider(type, interval, min = null, max = null) {
        activeType = type;

        getStats(type, interval, min, max).then(stats => {
            service.limits.min = (type === 'number') ? stats.min : new Date(stats.min);
            service.limits.max = (type === 'number') ? stats.max : new Date(stats.max);

            // set type limits from stats
            service.limits[type].min = service.limits.min;
            service.limits[type].max = service.limits.max;

            service.slider = {
                lock: true,
                interval: interval,
                type: type,
                minValue: stats.min,
                maxValue: stats.max,
                options: {
                    floor: stats.min,
                    ceil: stats.max,
                    step: (stats.max - stats.min) / interval,
                    minLimit: stats.min,
                    maxLimit: stats.max,
                    noSwitching: true,
                    showTicks: true,
                    draggableRange: true,
                    enforceStep: false
                }
            };

            if (type === 'date') {
                service.slider.options.translate = dateMillis => {
                    return formatDate(dateMillis);
                }
            }

            setDefQuery();

            // set handles WCAG
            setwcagHandles();
        });
    }

    function setwcagHandles() {
        // set tabindex on hadle to be wcag (needs the timeout because it is reset to 0 if not)
        // to have an element focusable inside the RAMP container, its tabindex must not be 0;
        // tabindex 0 is controlled by the browser; RAMP focus manager will ignore such elements and not set focus to them;
        $timeout(() => {
            Array.from(document.getElementsByClassName('rz-pointer')).forEach(handle => { handle.tabIndex = '-2' });
        }, 100);
    }

    function formatDate(dateMillis) {
        const date = new Date(dateMillis);
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }

    function setDefQuery() {
        const layerSlider = activeLayer.slider;
        const attr = layerSlider.selectedAttribute;
        const slider = service.slider;

        // synchronize range
        layerSlider.ranges[activeType].min = (activeType === 'number') ? slider.minValue : new Date(slider.minValue);
        layerSlider.ranges[activeType].max = (activeType === 'number') ? slider.maxValue : new Date(slider.maxValue);

        if (activeType === 'number') {
            activeLayer.definitionQuery = `${attr} >=  ${slider.minValue} AND ${attr} <  ${slider.maxValue}`;
        } else {
            const min = new Date(slider.minValue);
            const max = new Date(slider.maxValue);
            const dateMin = `${min.getMonth() + 1}/${min.getDate()}/${min.getFullYear()}`;
            const dateMax = `${max.getMonth() + 1}/${max.getDate()}/${max.getFullYear()}`;
            activeLayer.definitionQuery = `${attr} >= DATE \'${dateMin}\' AND ${attr} <= DATE \'${dateMax}\'`;
        }

        // calculate count / percent
        const values = [];
        activeLayer.formattedData.then(data => {
            for (let feature of data.rows) {
                if (feature[attr] >= slider.minValue &&
                        feature[attr] <= slider.maxValue) {
                    values.push(feature[attr]);
                }
            }

            layerSlider.selectCount = values.length
            layerSlider.percentCount = Math.ceil(values.length / layerSlider.count * 100);
        });
    }

    function getStats(type, interval, limitMin = null, limitMax = null) {
        const values = [];

        return new Promise(resolve => {
            activeLayer.formattedData.then(data => {
                for (let feature of data.rows) {
                    values.push(feature[activeLayer.slider.selectedAttribute]);
                }
    
                activeLayer.slider.limitMin = Math.min.apply(null, values);
                activeLayer.slider.limitMax = Math.max.apply(null, values);
                activeLayer.slider.count = values.length;
    
                const min = (limitMin === null) ? activeLayer.slider.limitMin : limitMin;
                const max = (limitMax === null) ? activeLayer.slider.limitMax : limitMax;
                const delta = max - min;
                const range = delta / interval;
    
                let bounds = min;
                let i = 0;
                const items = [];
                while (i <= interval) {
                    if (i !== interval) {
                        items.push(getCount(values, bounds, bounds + range));
                    } else {
                        // last loop, add item === to max to the last interval
                        items[interval -1] = items[interval -1] + getCount(values, bounds, bounds + range);
                    }
    
                    bounds += range;
                    i++;
                }
    
                drawSVG(items, interval);
    
                if (type === 'date') {
                    activeLayer.slider.limitMin = formatDate(activeLayer.slider.limitMin);
                    activeLayer.slider.limitMax = formatDate(activeLayer.slider.limitMax);
                }

                resolve({ min, max });
            }); 
        });
    }

    function getCount(values, min, max) {
        return values.filter(value => value >= min && value < max).length;
    }

    //#region Slider Settings
    function setRange(min, max) {
        const slider = service.slider;
        slider.minValue = (min >= service.limits.min) ? min : (activeType === 'number') ? service.limits.min : service.limits.min.getTime();
        slider.maxValue = (max <= service.limits.max) ? max : (activeType === 'number') ? service.limits.max : service.limits.max.getTime();

        events.$broadcast('slideEnded');
    }
    //#endregion

    //#region Slider SVG
    function drawSVG(rectangles, interval) {
        const svgElem = document.getElementById('drawing');
        const width = (svgElem.closest('.rv-slider-histo').offsetWidth - 24) / interval;
        const maxHeight = Math.max(...rectangles);

        // clean before adding
        while (svgElem.firstChild) {
            svgElem.removeChild(svgElem.firstChild);
        }

        const draw = SVG('drawing').size('100%', '100%');
        let start = 0;
        for (let rect of rectangles) {
            const height = (rect * 50) / maxHeight;
            draw.rect(width, height)
                .attr({ 'fill': '#ffe6ff', 'stroke': 'black', 'stroke-width': 1 }).move(start, 50 - height);

            start += width;
        }
    }
    //#endregion

    //#region Slider Bar
    function stepSlider(side) {
        const slider = service.slider;
        const step = (side === 'up') ? slider.options.step : -slider.options.step;
        slider.minValue = (!slider.lock) ? slider.minValue + step : slider.minValue;
        slider.maxValue = slider.maxValue + step;

        events.$broadcast('slideEnded');

        return (activeLayer.slider.limitMax - parseInt(slider.maxValue)) < step;
    }

    function refreshSlider() {
        initSlider(service.slider.type, service.slider.interval);
    }

    function lock(isLocked) {
        service.slider.lock = isLocked;
    }
    //#endregion

    //#region Slider Controls
    function toggleSetting() {
        service.isSettingOpen = !service.isSettingOpen;
    }

    function toggleHisto() {
        service.isHistoOpen = !service.isHistoOpen;

        const elem = document.getElementsByClassName('rz-selection')[0];
        elem.style.height =  service.isHistoOpen ? '95px' : '20px';
    }
    //#endregion

    function addLayer(layer) {
        layers.push(layer);

        service.layersName[layer._layerRecordId] = layer.name;
        console.log(layer.name)
    }

    function getLayers() {
        return layers;
    }

    function getLayer(id) {

        let selecLayer;
        for (let i = 0; i < layers.length; i++) {
            if (layers[i]._layerRecordId === id) selecLayer = layers[i];
        }

        return selecLayer;
    }

    function setActiveLayer(layer) {
        activeLayer = layer;
    }
}