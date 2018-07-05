const templateUrl = require('./slider-setting.html');

/**
 * @module rvSliderSetting
 * @module app.ui
 * @restrict E
 * @description
 *
 * The `rvSliderSetting` directive creates setting panel
 *
 */
angular
    .module('app.ui')
    .directive('rvSliderSetting', rvSliderSetting);

function rvSliderSetting() {
    const directive = {
        restrict: 'E',
        templateUrl,
        scope: { },
        controller: Controller,
        controllerAs: 'self',
        bindToController: true
    };

    return directive;

    /*********/

    function Controller($interval, $timeout, sliderService) {
        'ngInject';
        const self = this;
        self.sliderService = sliderService;
        self.updateLayer = updateLayer;
        self.updateAttribute = updateAttribute;
        self.updateInterval = updateInterval;
        self.updateLimits = updateLimits;
        self.updateType = updateType;
        self.updateRange = updateRange;

        self.types = { number: 'Number', date: 'Date' }; // Category has been remove for now
        self.categoryVal = [];

        const sliderInterval = $interval(() => {
            self.layers = sliderService.getLayers();

            if (self.layers.length !== 0) {
                $interval.cancel(sliderInterval);

                self.activeLayer = self.layers[0];
                sliderService.setActiveLayer(self.activeLayer);
                sliderService.initSlider(self.selectedType, self.selectedInterval);
            }
        }, 5000);

        function updateLayer() {
            self.activeLayer = sliderService.getLayer(self.selectedLayerId)
            sliderService.setActiveLayer(self.activeLayer);
            setSlider();
        }

        function updateAttribute() {
            // Category has been remove for now
            // if (self.selectedType === 'category') {
            //     setCategoryInterval();
            // } else {
            setSlider();
            // }
        }

        function updateInterval() {
            const limits = parseLimits();
            setSlider(limits.min, limits.max);
        }

        function updateLimits() {
            const limits = parseLimits();
            setSlider(limits.min, limits.max);
        }

        function parseLimits() {
            const min = (self.selectedType === 'number') ? sliderService.limits.number.min :
                sliderService.limits.date.min.getTime();
            const max = (self.selectedType === 'number') ? sliderService.limits.number.max :
                sliderService.limits.date.max.getTime();

            return { min, max };
        }

        function updateType() {
            $timeout(() => {
                // Category has been remove for now
                // if (self.selectedType === 'category') {
                //     setCategoryInterval();
                // } else {
                setSlider();
                // }
            }, 100);
        }

        // Category has been remove for now
        // function setCategoryInterval() {
        //     // get unique values from string field to populate interval
        //     const values = [];
        //     activeLayer.formattedData.then(data => {
        //         for (let feature of data.rows) {
        //             values.push(feature[activeLayer.slider.selectedAttribute]);
        //         }

        //         self.categoryVal = [...new Set(values)].slice(0, 25);
        //         sliderService.initSliderCategory();
        //     });
        // }

        function updateRange() {
            sliderService.setRange(self.activeLayer.slider.ranges[self.selectedType].min, self.activeLayer.slider.ranges[self.selectedType].max);
        }

        function setSlider(min = null, max = null) {
            sliderService.initSlider(self.selectedType, self.selectedInterval, min, max);
        }
    }
}