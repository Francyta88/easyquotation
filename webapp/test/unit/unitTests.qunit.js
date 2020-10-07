/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zotc_easyquote/zotc_easyquote/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});