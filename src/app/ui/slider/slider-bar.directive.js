import domtoimage from 'dom-to-image';
const gifshot = require('gifshot');
const FileSaver = require('file-saver');

const templateUrl = require('./slider-bar.html');

/**
 * @module rvSliderBar
 * @module app.ui
 * @restrict E
 * @description
 *
 * The `rvSliderBar` directive creates the slider bar
 *
 */
angular
    .module('app.ui')
    .directive('rvSliderBar', rvSliderBar);

function rvSliderBar() {
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

    function Controller($interval, sliderService) {
        'ngInject';
        const self = this;

        self.play = play;
        self.pause = pause;
        self.step = step;
        self.refresh = refresh;
        self.lock = lock;

        self.isPlaying = false;
        self.isLocked = true;

        self.gif = false;
        
        let playInterval;

        // get map node + width and height
        const node = document.getElementsByClassName('rv-esri-map')[0];
        const width = node.offsetWidth;
        const height = node.offsetHeight;

        let gifImages = [];

        function play() {
            self.isPlaying = !self.isPlaying;
           
            gifImages = [];

            playInstant();
            playInterval = $interval(playInstant, self.selectedDelay);
        }

        function playInstant() {
            if (sliderService.stepSlider('up')) { pause(); }

            if (self.gif) {
                domtoimage.toPng(node, { bgcolor: 'white' }).then(dataUrl => {
                    gifImages.push(dataUrl);
                }).catch(error => {
                    console.error('Not able to get screen shot!', error);
                });
            }
        }

        function pause() {
            self.isPlaying = !self.isPlaying;
            $interval.cancel(playInterval);

            if (self.gif) {
                gifshot.createGIF({
                    'images': gifImages,
                    'interval': self.selectedDelay,
                    'gifWidth': width,
                    'gifHeight': height
                },function(obj) {
                    if(!obj.error) {
                        FileSaver.saveAs(dataURItoBlob(obj.image), 'fgpv-slider-export.gif' );
                    }
                });
            }

            self.gif = false;
        }

        function step(direction) {
            sliderService.stepSlider(direction);
        }

        function refresh() {
            sliderService.refreshSlider();
        }

        function lock () {
            self.isLocked = !self.isLocked;
            sliderService.lock(self.isLocked);
        }

        function dataURItoBlob(dataURI) {
            // https://stackoverflow.com/questions/46405773/saving-base64-image-with-filesaver-js
            // convert base64 to raw binary data held in a string
            // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
            const byteString = atob(dataURI.split(',')[1]);
          
            // separate out the mime component
            const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
          
            // write the bytes of the string to an ArrayBuffer
            const ab = new ArrayBuffer(byteString.length);
          
            // create a view into the buffer
            const ia = new Uint8Array(ab);
          
            // set the bytes of the buffer to the correct values
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
          
            // write the ArrayBuffer to a blob, and you're done
            const blob = new Blob([ab], {type: mimeString});
            
            return blob;
        }
    }
}