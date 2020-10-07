sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"zotc_easyquote/zotc_easyquote/model/models",
	"sap/ui/fl/FakeLrepConnectorLocalStorage"
], function (UIComponent, Device, models, FakeLrepConnectorLocalStorage) {
	"use strict";

	return UIComponent.extend("zotc_easyquote.zotc_easyquote.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);
			FakeLrepConnectorLocalStorage.enableFakeConnector(sap.ui.require.toUrl("sap/ui/demo/smartControls/lrep/component-test-changes.json")); //per gesitire le varianti

			// enable routing
			// this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

		}
	});
});