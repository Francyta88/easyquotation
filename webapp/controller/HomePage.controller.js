sap.ui.define([
	"./BaseController",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	"zotc_easyquote/zotc_easyquote/formatter/Formatter",
	"sap/m/MessageToast"

], function (BaseController, History, JSONModel, Filter, FilterOperator, Formatter, MessageToast) {
	"use strict";

	return BaseController.extend("zotc_easyquote.zotc_easyquote.controller.HomePage", {
		formatter: Formatter,

		onInit: function () {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			self.getView().setModel(new JSONModel({
				filterSalesOrganization: "",
				filterSalesGroup: "",
				filterSalesOffice: "",
				filterBname: ""
			}), "viewState");
			self.getView().setBusyIndicatorDelay(0);
			self.getOwnerComponent().getRouter().attachRoutePatternMatched(self.handleRouteMatched, self);

			var viewStateModel = self.getView().getModel("viewState");

			viewStateModel.setProperty("/filterBname", oGlobalModel.getProperty("/userInfo/userName"));

			/* LOGICA DI ZPSQT
				viewStateModel.setProperty("/filterSalesOffice", oGlobalModel.getProperty("/salesOffice"));
				viewStateModel.setProperty("/filterSalesGroup", oGlobalModel.getProperty("/salesGroup"));
				viewStateModel.setProperty("/filterSalesOrganization", oGlobalModel.getProperty("/salesOrganization"));
			*/
		},

		handleRouteMatched: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var table = self.getView().byId("LineItemsSmartTable");

			if (oGlobalModel.getProperty("/updateTable")) {
				table.rebindTable();
			}

		},

		onBeforeRebindTable: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var viewStateModel = self.getView().getModel("viewState");
			var binding = oEvent.getParameter("bindingParams");
			var oFilter;

			/* LOGICA DI ZPSQT
						if (viewStateModel.getProperty("/filterSalesOrganization")) {
							oFilter = new Filter("SalesOrganization", FilterOperator.EQ, viewStateModel.getProperty("/filterSalesOrganization"));
							binding.filters.push(oFilter);
						}

						if (viewStateModel.getProperty("/filterSalesGroup")) {
							oFilter = new Filter("SalesGroup", FilterOperator.EQ, viewStateModel.getProperty("/filterSalesGroup"));
							binding.filters.push(oFilter);
						}
						*/

			oFilter = new Filter("SalesOrganization", FilterOperator.EQ, oGlobalModel.getProperty("/userInfo/salesOrganization"));
			binding.filters.push(oFilter);

			oFilter = new Filter("DistributionChannel", FilterOperator.EQ, oGlobalModel.getProperty("/userInfo/distributionChannel"));
			binding.filters.push(oFilter);

			oFilter = new Filter("SalesGroup", FilterOperator.EQ, oGlobalModel.getProperty("/userInfo/salesGroup"));
			binding.filters.push(oFilter);

			if (viewStateModel.getProperty("/filterBname")) {
				oFilter = new Filter("Bname", FilterOperator.EQ, viewStateModel.getProperty("/filterBname"));
				binding.filters.push(oFilter);
			}

			if (viewStateModel.getProperty("/filterSalesOffice")) {
				oFilter = new Filter("SalesOffice", FilterOperator.EQ, viewStateModel.getProperty("/filterSalesOffice"));
				binding.filters.push(oFilter);
			}

			oGlobalModel.setProperty("/updateTable", false);

		},

		onRowSelection: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var element = oEvent.getParameter("listItem").getBindingContext();

			oGlobalModel.setProperty("/quotationSelected", element.getObject());
			oGlobalModel.setProperty("/createMode", false);

			self.getRouter().navTo("QuotationsDetails");
		},

		pressCreate: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			oGlobalModel.setProperty("/quotationSelected", {});
			oGlobalModel.setProperty("/quotationSelected/NetValue", "0.000");
			oGlobalModel.setProperty("/headerInfo/headerInfoQuotationCart", 0);
			oGlobalModel.setProperty("/cart", []);
			oGlobalModel.setProperty("/createMode", true);

			oGlobalModel.refresh();

			self.getRouter().navTo("QuotationsDetails");
		},

		changeQuotesType: function (oEvent) {
			var self = this;

			var ind = oEvent.getParameter("selectedItem").getKey();
			if (ind == 0) {
				self.dashboardFilteringLoad(true); //myQuotes
			} else {
				self.dashboardFilteringLoad(false); //SalesOfficeQuotes
			}
		},

		dashboardFilteringLoad: function (myQuotes) {
			var self = this;
			var table = self.getView().byId("LineItemsSmartTable");
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var viewStateModel = self.getView().getModel("viewState");

			self.refreshViewState();

			if (myQuotes) {
				viewStateModel.setProperty("/filterBname", oGlobalModel.getProperty("/userInfo/userName"));
			} else {
				viewStateModel.setProperty("/filterSalesOffice", oGlobalModel.getProperty("/userInfo/salesOffice"));
			}

		},

		/* LOGICA DI ZPSQT
				changeQuotesType: function (oEvent) {
					var self = this;
					
					var ind = oEvent.getParameter("selectedItem").getKey();
					if (ind == 0) {
						self.dashboardFilteringLoad(false, false, false);
					} else {
						self.dashboardFilteringLoad(false, false, true);
					}
				},

				dashboardFilteringLoad: function (sG, sO, noGr) {
					var self = this;
					var table = self.getView().byId("LineItemsSmartTable");
					var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
					var viewStateModel = self.getView().getModel("viewState");
					var soFilter, sgFilter, sogFilter;

					self.refreshViewState();

					soFilter = oGlobalModel.getProperty("/salesOrganization");

					if (sG) {
						sgFilter = sG;
					} else {
						sgFilter = oGlobalModel.getProperty("/salesGroup");
					}

					if (sO) {
						sogFilter = sO;
					} else {
						sogFilter = oGlobalModel.getProperty("/salesOffice");
					}

					if ((!oGlobalModel.getProperty("/backOffice") && !noGr) || sG) {
						viewStateModel.setProperty("/filterSalesOffice", sogFilter);
						viewStateModel.setProperty("/filterSalesGroup", sgFilter);
						viewStateModel.setProperty("/filterSalesOrganization", soFilter);
					} else {
						viewStateModel.setProperty("/filterSalesOrganization", soFilter);
					}

					// table.rebindTable();
				},
				*/

		refreshViewState: function () {
			var self = this;
			var viewStateModel = self.getView().getModel("viewState");

			viewStateModel.setProperty("/filterSalesOrganization", "");
			viewStateModel.setProperty("/filterSalesGroup", "");
			viewStateModel.setProperty("/filterSalesOffice", "");
			viewStateModel.setProperty("/filterBname", "");
		},

		clearFilter: function (oEvent) {
			var self = this;
			var table = self.getView().byId("LineItemsSmartTable");

			var smartFilterBar = this.getView().byId("smartFilterBar");
			smartFilterBar.clear();
			table.rebindTable();
		},

		onBeforeExport: function (oEvent) {
			var self = this;
			var flagSalesCurrency = false;
			var ind = 0;

			oEvent.getParameter("exportSettings").workbook.columns.forEach(function (x, index) {
				if (x.columnId === "container-zotc_easyquote---HomePage--Number") {
					x.property = ["QuotationNo", "Version"];
					x.template = "{0} / {1}";
					x.width = 20;
				}

				if (x.columnId === "container-zotc_easyquote---HomePage--Value") {
					flagSalesCurrency = true; // se è presente il valore alla colonna successiva mostro la currency
					ind = index;
					// x.property = ["NetValue", "SalesCurrency"];
					// x.template = "{0} ({1})";
				}
			});

			if (flagSalesCurrency) {

				oEvent.getParameter("exportSettings").workbook.columns.splice(ind + 1, 0, {
					"label": "Currency",
					"columnId": "container-zotc_easyquote---HomePage--SalesCurrency",
					"property": "SalesCurrency"
				});
			}
		}
	});
});