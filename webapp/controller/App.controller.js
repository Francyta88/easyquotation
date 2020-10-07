sap.ui.define([
	// "./BaseController",
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator'
], function (BaseController, JSONModel, MessageToast, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("zotc_easyquote.zotc_easyquote.controller.App", {
		onInit: function () {

			/*NOTA:
			globalModel contiene:
			- client
			- userFullName
			- userEmail
			- language
			- ownSalesOffice
			- salesOffice
			- salesOrganization
			- ownSalesGroup
			- salesGroup
			- companyCode
			- salesPersonName
			- distributionChannel
			- distributionChannelName
			- countries[]
			- deliveryTerms[]
			- paymentTerms[]
			- currency
			*/

			var oGlobalModel = new JSONModel({
					uomList: [{
						key: "M",
						value: "Meter"
					}, {
						key: "KM",
						value: "Kilometer"
					}, {
						key: "FT",
						value: "Foot"
					}, {
						key: "IN",
						value: "Inch"
					}]
				}),
				self = this;

			// self.getOwnerComponent().getRouter().destroy();

			oGlobalModel.setSizeLimit(10000);
			self.getOwnerComponent().setModel(oGlobalModel, "globalModel");

			oGlobalModel.setProperty("/metalsInfo", {});
			oGlobalModel.setProperty("/headerInfo", {});
			oGlobalModel.setProperty("/userInfo", {});

			var fieldsExcel = {
				"Material": "",
				"CustomerMaterial": "",
				"Plant": "",
				"Factor": "",
				"Length": "",
				"PriceCondition": "",
				"ConditionValue": "",
				"ConditionLength": "",
				"MeasureUnit": "",
				"Cm": "",
				"RequestedDate": "",
				"ItemNumber": "",
				"ZCustLength": ""
			};

			oGlobalModel.setProperty("/fieldsExcel", fieldsExcel);

			var i18nTxt = self.getView().getModel("i18n").getResourceBundle();

			var statusList = [{
				key: "Draft",
				value: i18nTxt.getText("draft")
			}, {
				key: "Open",
				value: i18nTxt.getText("open")
			}, {
				key: "ApprovalNeeded",
				value: i18nTxt.getText("approvalNeeded")
			}, {
				key: "NotApproved",
				value: i18nTxt.getText("notApproved")
			}, {
				key: "Rejected",
				value: i18nTxt.getText("rejected")
			}, {
				key: "Approved",
				value: i18nTxt.getText("approved")
			}, {
				key: "SentToCustomer",
				value: i18nTxt.getText("sentToCustomer")
			}, {
				key: "SentToSap",
				value: i18nTxt.getText("sentToSap")
			}, {
				key: "AcceptedByCustomer",
				value: i18nTxt.getText("acceptedByCustomer")
			}, {
				key: "RejectedByCustomer",
				value: i18nTxt.getText("rejectedByCustomer")
			}, {
				key: "Lost",
				value: i18nTxt.getText("lost")
			}, {
				key: "Closed",
				value: i18nTxt.getText("closed")
			}];

			oGlobalModel.setProperty("/statusList", statusList);

			self.getUserData();
			self.getCountries();
			self.getDeliveryTerms();
			self.getPaymentTerms();
		},

		getUserData: function () {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			self.getView().setBusy(true);
			self.getOwnerComponent().getModel("oDataModel").read("/UserDataSet", {
				urlParameters: {
					$expand: "User2SalesManager"
				},
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {
						oGlobalModel.refresh();

						oGlobalModel.setProperty("/userInfo/userName", oData.results[0].Bname);
						oGlobalModel.setProperty("/userInfo/client", oData.results[0].Client);
						oGlobalModel.setProperty("/userInfo/userFullName", oData.results[0].Name);
						oGlobalModel.setProperty("/userInfo/userEmail", oData.results[0].Email);
						oGlobalModel.setProperty("/userInfo/language", oData.results[0].User2SalesManager.Langu);
						oGlobalModel.setProperty("/userInfo/ownSalesOffice", oData.results[0].User2SalesManager.Vkbur);
						oGlobalModel.setProperty("/userInfo/salesOffice", oData.results[0].User2SalesManager.Vkbur);
						oGlobalModel.setProperty("/userInfo/salesOrganization", oData.results[0].User2SalesManager.Vkorg);
						oGlobalModel.setProperty("/userInfo/ownSalesGroup", oData.results[0].User2SalesManager.Vkgrp);
						oGlobalModel.setProperty("/userInfo/salesGroup", oData.results[0].User2SalesManager.Vkgrp);
						oGlobalModel.setProperty("/userInfo/companyCode", oData.results[0].User2SalesManager.Bukrs);
						oGlobalModel.setProperty("/userInfo/salesPersonName", oData.results[0].User2SalesManager.SalesPersonName);
						oGlobalModel.setProperty("/userInfo/distributionChannel", oData.results[0].User2SalesManager.Vtweg);
						oGlobalModel.setProperty("/userInfo/distributionChannelName", oData.results[0].User2SalesManager.Vtext);
						oGlobalModel.setProperty("/userInfo/salesDocumentType", oData.results[0].User2SalesManager.Auart);

						self.getView().setBusy(false);
						self.getSalesGroups();
					} else {
						self.getView().setBusy(false);
					}
				},
				error: function (result, b) {
					self.getView().setBusy(false);
					MessageToast.show(result.message);
				}
			});
		},

		getSalesGroups: function () {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var filter = [];

			filter.push(new Filter({
				path: "SalesOrganization",
				operator: FilterOperator.EQ,
				value1: oGlobalModel.getProperty("/userInfo/salesOrganization")
			}));

			filter.push(new Filter({
				path: "DistributionChannel",
				operator: FilterOperator.EQ,
				value1: oGlobalModel.getProperty("/userInfo/distributionChannel")
			}));

			filter.push(new Filter({
				path: "SalesGroup",
				operator: FilterOperator.EQ,
				value1: oGlobalModel.getProperty("/userInfo/salesGroup")
			}));

			filter.push(new Filter({
				path: "SalesOffice",
				operator: FilterOperator.EQ,
				value1: oGlobalModel.getProperty("/userInfo/salesOffice")
			}));

			self.getView().setBusy(true);

			self.getOwnerComponent().getModel("oDataModel").read("/SalesGroupsSet", {
				async: false,
				filters: filter,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {
						oGlobalModel.setProperty("/salesGroups", oData.results);
						oGlobalModel.refresh();

						self.getView().setBusy(false);

						self.getRouter().initialize();

						self.getCompanyInfo();
					} else {
						oGlobalModel.setProperty("/salesGroups", []);
						oGlobalModel.refresh();
						self.getView().setBusy(false);
					}
				},
				error: function (result, b) {
					oGlobalModel.setProperty("/salesGroups", []);
					oGlobalModel.refresh();
					self.getView().setBusy(false);
					MessageToast.show(result.message);
				}
			});
		},

		getCompanyInfo: function () {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var filter = [];

			filter.push(new Filter({
				path: "Companycode",
				operator: FilterOperator.EQ,
				value1: oGlobalModel.getProperty("/userInfo/companyCode")
			}));

			self.getView().setBusy(true);

			self.getOwnerComponent().getModel("oDataModel").read("/CompanyInfoSet", {
				async: false,
				filters: filter,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {
						oGlobalModel.setProperty("/userInfo/currency", oData.results[0].Currency);
						oGlobalModel.refresh();

						self.getView().setBusy(false);
						// self.getMetalPrice(); NOT USED
					} else {
						oGlobalModel.setProperty("/currency", []);
						oGlobalModel.refresh();
						self.getView().setBusy(false);
					}
				},
				error: function (result, b) {
					oGlobalModel.setProperty("/currency", []);
					oGlobalModel.refresh();
					self.getView().setBusy(false);
					MessageToast.show(result.message);
				}
			});
		},

		/*	getMetalPrice: function () {
				var self = this;
				var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
				var filterAl = [];
				var filterPb = [];
				var filterCu = [];
				var lo_filter = [];

				var gDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
					pattern: "YYYY-MM-ddTHH:MM:ss"
				});
				var dst = gDateFormat.format(new Date());

				oGlobalModel.setProperty("/metalsInfo/metalsDate", dst);

				lo_filter = new Filter({
					path: "SalesOrganization",
					operator: FilterOperator.EQ,
					value1: oGlobalModel.getProperty("/userInfo/salesOrganization")
				});

				filterAl.push(lo_filter);
				filterPb.push(lo_filter);
				filterCu.push(lo_filter);

				lo_filter = new Filter({
					path: "Currency",
					operator: FilterOperator.EQ,
					value1: oGlobalModel.getProperty("/userInfo/currency")
				});

				filterAl.push(lo_filter);
				filterPb.push(lo_filter);
				filterCu.push(lo_filter);

				lo_filter = new Filter({
					path: "Date",
					operator: FilterOperator.EQ,
					value1: dst
				});

				filterAl.push(lo_filter);
				filterPb.push(lo_filter);
				filterCu.push(lo_filter);

				filterAl.push(new Filter({
					path: "Metal",
					operator: FilterOperator.EQ,
					value1: 'AL'
				}));

				filterPb.push(new Filter({
					path: "Metal",
					operator: FilterOperator.EQ,
					value1: 'PB'
				}));

				filterCu.push(new Filter({
					path: "Metal",
					operator: FilterOperator.EQ,
					value1: 'CU'
				}));

				self.getOwnerComponent().getModel("oDataModel").read("/MetalPriceSet", {
					filters: filterAl,
					success: function (oData, response) {

						oGlobalModel.setProperty("/metalsInfo/priceAl", oData.results[0].Price);
						oGlobalModel.setProperty("/metalsInfo/metalsText", "Al:" + oGlobalModel.getProperty("/metalsInfo/priceAl") + " Cu:" +
							oGlobalModel.getProperty(
								"/metalsInfo/priceCu") + " Pb:" + oGlobalModel.getProperty("/metalsInfo/pricePb") +
							" 1t/" + oGlobalModel.getProperty("/userInfo/currency"));
						oGlobalModel.refresh();
					}
				});

				self.getOwnerComponent().getModel("oDataModel").read("/MetalPriceSet", {
					filters: filterPb,
					success: function (oData, response) {

						oGlobalModel.setProperty("/metalsInfo/pricePb", oData.results[0].Price);
						oGlobalModel.setProperty("/metalsInfo/metalsText", "Al:" + oGlobalModel.getProperty("/metalsInfo/priceAl") + " Cu:" +
							oGlobalModel.getProperty(
								"/metalsInfo/priceCu") + " Pb:" + oGlobalModel.getProperty("/metalsInfo/pricePb") +
							" 1t/" + oGlobalModel.getProperty("/userInfo/currency"));
						oGlobalModel.refresh();
					}
				});

				self.getOwnerComponent().getModel("oDataModel").read("/MetalPriceSet", {
					filters: filterCu,
					success: function (oData, response) {

						oGlobalModel.setProperty("/metalsInfo/priceCu", oData.results[0].Price);
						oGlobalModel.setProperty("/metalsInfo/metalsText", "Al:" + oGlobalModel.getProperty("/metalsInfo/priceAl") + " Cu:" +
							oGlobalModel.getProperty(
								"/metalsInfo/priceCu") + " Pb:" + oGlobalModel.getProperty("/metalsInfo/pricePb") +
							" 1t/" + oGlobalModel.getProperty("/userInfo/currency"));
						oGlobalModel.refresh();
					}
				});
			},*/

		getCountries: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			self.getOwnerComponent().getModel("oDataModel").read("/CountriesSet", {
				async: false,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {
						oGlobalModel.setProperty("/countries", oData.results);
						oGlobalModel.refresh();
					} else {
						oGlobalModel.setProperty("/countries", []);
						oGlobalModel.refresh();
					}
				},
				error: function (result, b) {
					oGlobalModel.setProperty("/countries", []);
					oGlobalModel.refresh();
					MessageToast.show(result.message);
				}
			});
		},

		getDeliveryTerms: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			self.getOwnerComponent().getModel("oDataModel").read("/IncoTermsSet", {
				async: false,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {

						oGlobalModel.setProperty("/deliveryTerms", oData.results);
						oGlobalModel.refresh();
					} else {
						oGlobalModel.setProperty("/deliveryTerms", []);
						oGlobalModel.refresh();
					}
				},
				error: function (result, b) {
					oGlobalModel.setProperty("/deliveryTerms", []);
					oGlobalModel.refresh();
					MessageToast.show(result.message);
				}
			});
		},

		getPaymentTerms: function () {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			self.getOwnerComponent().getModel("oDataModel").read("/PaymentTermsSet", {
				async: false,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {
						oGlobalModel.setProperty("/paymentTerms", oData.results);
						oGlobalModel.refresh();
					} else {
						oGlobalModel.setProperty("/paymentTerms", []);
						oGlobalModel.refresh();
					}
				},
				error: function (result, b) {
					oGlobalModel.setProperty("/paymentTerms", []);
					oGlobalModel.refresh();
					MessageToast.show(result.message);
				}
			});
		}

	});
});