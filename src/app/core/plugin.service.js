/**
 * @name pluginService
 * @module app.core
 * @description
 *
 * The `pluginService` service provides access to all viewer plugins. You can optionally provide a callback for specific
 * types of plugins which is triggered when a plugin is created.
 */
angular
    .module('app.core')
    .factory('pluginService', pluginService)
    .directive('rvSideNavPlugin', rvSideNavPlugin);

//let dirOptions;

function pluginService(translationService, $mdDialog, referenceService) {
    const service = {
        onCreate,
        register,
        openDialogInfo,
        sideMenuDirective
    };

    const pluginList = []; // an array of registered plugin instances
    const onCreateList = []; // an array of object pairs in the form {class, callback}.

    return service;

    /**
     * Registers a plugin instance with this viewer instance. Triggers any onCreate callbacks registered
     * to this plugin type.
     *
     * @function    register
     * @param       {Object}    plugin    the plugin instance being registered to this viewer
     */
    function register() {
        // this methods arguments are structured as [ PluginClass, id:string, ...pluginInitParams, mapApiReference]
        // In other words, this function expects a minimum of three parameters such that:
        //   - the first parameter is a plugin class reference
        //   - the second parameter is a unique plugin id string
        //   - the last parameter is the external api object
        // Any additional parameters are passed directly to the plugins init method
        const params = [...arguments];
        const Plugin = params.splice(0, 1)[0];
        const pluginId = params.splice(0, 1)[0];
        const api = params.pop();

        const p = new Plugin(pluginId, api);

        // Plugins can define an init method which is an alternative to them overriding the constructor method.
        // The former is used so that plugin authors don't need to capture and super() redundant parameters like API and plugin id for BasePlugin
        if (typeof p.init === 'function') {
            p.init(...params);
        }

        // check if the plugin already exists or shares an id with another plugin
        if (pluginList.find(pi => pi === p || pi.id === p.id)) {
            throw new Error('A plugin with the same instance or ID has already been registered.');
        }

        // add plugin id to translations to avoid conflicts
        Object.keys(p.translations).forEach(lang => {
            p.translations[lang] = {
                plugin: { [p.id]: p.translations[lang] }
            };
        });

        // modify existing translations to include the plugin translations
        translationService(p.translations);
        pluginList.push(p);

        // execute onCreate callbacks for this plugin type
        onCreateList.filter(x => p instanceof x.pluginType).forEach(x => x.cb(p));
    }

    /**
     * Registers a callback function that is executed whenever a specific type of plugin is created as defined by pluginType
     *
     * @function    onCreate
     * @param       {Function}    pluginType    pointer to the plugin class
     * @param       {Function}    cb            callback function to execute on plugin creation
     */
    function onCreate(pluginType, cb) {
        // save to list which is checked whenever a new plugin is registered
        onCreateList.push({
            pluginType,
            cb
        });

        // trigger this callback for any plugin already created
        pluginList.filter(pi => pi instanceof pluginType).forEach(cb);
    }

    /**
     * Open mdDialog window
     *
     * @function    openDialogInfo
     * @param       {Object}    opts    options for the mdDialog window
     * @return      {Object}    $mdDialog dialog window
     */
    function openDialogInfo(opts) {
        $mdDialog.show({
            controller: PluginDialogController,
            controllerAs: 'self',
            locals: {
                items: opts.items
            },
            template: opts.template,
            parent: referenceService.panels.shell,
            disableParentScroll: opts.hasOwnProperty('disableParentScroll') ? opts.disableParentScroll : false,
            clickOutsideToClose: opts.hasOwnProperty('clickOutsideToClose') ? opts.clickOutsideToClose : true,
            fullscreen: opts.hasOwnProperty('fullscreen') ? opts.fullscreen : false
        });

        return $mdDialog;
    }

    /**
     * Controller to set content for $mdDialog
     *
     * @function PluginDialogController
     * @private
     * @param {Object}  items    the items to set inside the dialog
     */
    function PluginDialogController(items) {
        'ngInject';
        const self = this;

        self.close = $mdDialog.hide;

        // loop trought all key value pair to create reference on self
        for (let [key, val] of Object.entries(items)) {
            self[key] = val;
        }
    }
}

function sideMenuDirective(options) {
    dirOptions = options
}

function rvSideNavPlugin() {
    const directive = {
        restrict: 'E',
        template: `<md-sidenav rv-basemap class="rv-basemap-selector md-sidenav-left md-whiteframe-z2" md-component-id="plug">
                <header class="rv-basemap-header">
                        <h3 class="ng-binding md-headline">{{ 'nav.label.basemap' | translate }}</h3>
                        <md-button class="md-icon-button black rv-button-24 rv-minimize-button md-button md-ink-ripple" ng-click="self.close()" aria-label="{{ 'contentPane.aria.close' | translate }}">
                            <md-icon md-svg-src="community:chevron-double-left"></md-icon>
                        </md-button>
                    </header>

                    </md-sidenav>`,
        controller: sideNavPluginController,
        controllerAs: 'self',
        bindToController: true,
        link: function (scope, element, attr) {
            console.log('inside');
        }
    };
    return directive;
}

function sideNavPluginController($mdSidenav) {
    'ngInject';
    const self = this;

    self.close = close;

    //self.stuff = (typeof dirOptions !== 'undefined') ?  dirOptions.stuff :  '<span>Firsts</span>';

    function close() {
        return $mdSidenav('plug').close();
    }
}
