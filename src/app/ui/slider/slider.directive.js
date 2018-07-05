const templateUrl = require('./slider.html');

/**
 * @module rvSlider
 * @module app.ui
 * @restrict E
 * @description
 *
 * The `rvSlider` directive creates the slider panel
 *
 */
angular
    .module('app.ui')
    .directive('rvSlider', rvSlider);

function rvSlider() {
    const directive = {
        restrict: 'E',
        templateUrl,
        scope: {},
        controller: Controller,
        controllerAs: 'self',
        bindToController: true
    };

    return directive;

    /*********/

    function Controller($interval, events, sliderService, configService) {
        'ngInject';
        const self = this;

        self.toggleSetting = toggleSetting;
        self.toggleHisto = toggleHisto;
        self.sliderService = sliderService;

        events.$on(events.rvLayerRecordLoaded, (event, layerName) => {

            const sliderInterval = $interval(() => {
                const entries = configService.getSync.map.legendBlocks.entries;

                for (let entry of entries) {
                    getEntry(entry, layerName, sliderInterval);
                }
            }, 500);
        });
        
        function getEntry(entry, layerName, sliderInterval) {
            if (entry.blockType === 'group') {
                for (let groupEntry of entry.entries) {
                    getEntry(groupEntry, layerName, sliderInterval);
                }
            } else if (entry.blockType === 'node' && entry.layerRecordId === layerName) {
                $interval.cancel(sliderInterval);

                entry.formattedData.then(data => {
                    setLayer(entry, data);
                });
            }
        }

        function setLayer(entry, data) {
            const fields = {
                'number': {},
                'category': {},
                'date': {}
            };

            for (let field of data.fields) {
                if (field.type.endsWith('Double') || field.type.endsWith('Integer')) {
                    fields.number[field.name] = field.alias;
                } else if (field.type === 'esriFieldTypeString') {
                    //TODO: string should only work from config file....
                    fields.category[field.name] = field.alias;
                } else if (field.type === 'esriFieldTypeDate') {
                    fields.date[field.name] = field.alias;
                }
            }
            entry.slider = {
                fields,
                ranges: {
                    number: { min: 0, max: 0 },
                    date: { min: 0, max: 0 }
                } };

            sliderService.addLayer(entry);
        }

        function toggleSetting() {
            sliderService.toggleSetting();
        }

        function toggleHisto() {
            sliderService.toggleHisto();
        }
    }
}
