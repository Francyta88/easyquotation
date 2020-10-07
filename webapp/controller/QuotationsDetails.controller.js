/*globals XLSX*/
sap.ui.define([
	"./BaseController",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	"zotc_easyquote/zotc_easyquote/formatter/Formatter",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/core/library",
	"sap/ui/core/IconColor"

], function (BaseController, History, JSONModel, Filter, FilterOperator, Formatter, MessageBox, MessageToast, Library, IconColor) {
	"use strict";

	return BaseController.extend("zotc_easyquote.zotc_easyquote.controller.QuotationsDetails", {
		formatter: Formatter,

		onInit: function (oEvent) {
			var self = this;

			self.getView().setModel(new JSONModel({

				iconSalesDataPage: IconColor.Default,
				iconCustomerDataPage: IconColor.Default,
				checkInputAfterPressSave: false, //inizia a fare il controllo dei campi di input solo dopo che l'utente ha premuto SAVE o SAVE NEW VERSION

				/***** BEGIN SALES DATA *****/

				oldTitlePO: "",
				newTitlePO: "",

				/*Begin Sales Manager/Username*/
				enableSalesManager: true,
				/*End Sales Manager/Username*/

				/*Begin Currency*/
				selCurrencyCode: "",
				selCurrencyName: "",
				valueCurrency: "1.00000",
				/*Begin Currency*/

				/*Begin Text*/
				selExtendedTextCode: "",
				selExtendedTextValue: "",
				selContentText: "",
				/*End Text*/
				/***** END SALES DATA *****/

				/***** BEGIN CUSTOMER DATA *****/

				keepDataSAP: false, //ogni volta che seleziono un item dalla smartTable faccio la chiamata di DeliveryTerms e ShipTo settando il primo valore come selezionato.
				//la prima volta deve considerare il valore memorizzato in SAP

				/*Begin POP-UP EDIT/REMOVE Contact Person*/
				enableBtnEditContactPerson: false,
				selRemoveContactPersonCustomerId: "",
				selRemoveContactPersonEmail: "",
				selRemoveContactPersonFirstName: "",
				selRemoveContactPersonLastName: "",
				selRemoveContactPersonPhone: "",
				selRemoveContactPersonNr: "",
				/*End POP-UP EDIT/REMOVE Contact Person*/

				/*Begin SEARCH MATERIAL AREA*/
				materialSearch: [], //verifica che i materiali cercati nella pop-up "SearchMaterialArea" esistono (pusho quelli che non esistono),
				materialSearchCust: [],
				countCallPricingTot: 0,
				countCallPricing: 0,
				materialSearchNotFound: [],
				oDataResults: [],
				materialFound: [],
				plantNotAllowed: []

				/*End SEARCH MATERIAL AREA*/

				/***** END CUSTOMER DATA *****/

			}), "viewState");

			self.getView().setModel(new JSONModel({}), "customExtendedTexts");

			self.getView().setModel(new JSONModel({}), "customCustomers");

			self.getView().setModel(new JSONModel({}), "customCustomerDistributionChannel");

			self.getView().setModel(new JSONModel({}), "customCustomerShipTo");

			self.getView().setModel(new JSONModel({}), "customCustomerContactPerson");

			self.getOwnerComponent().getRouter().attachRoutePatternMatched(self.handleRouteMatched, self);

			self.getCurrencies();

			self.customSearchArea = new sap.ui.model.json.JSONModel();
			self.getView().setModel(self.customSearchArea, "customSearchArea");

		},

		handleRouteMatched: function (oEvent) {
			var self = this;
			var viewTarget = oEvent.getParameter("config").name;
			var viewStateModel = self.getView().getModel("viewState");
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var customExtendedTextsModel = self.getView().getModel("customExtendedTexts");
			var currentView = "QuotationsDetails";
			var homePageView = "zotc_easyquote.zotc_easyquote.view.HomePage";
			var previousPageView = oEvent.getParameters().targetControl.oFromPage.getViewName();
			var customCustomerContactPersonModel = self.getView().getModel("customCustomerContactPerson");
			var customCustomerDistributionChannelModel = self.getView().getModel("customCustomerDistributionChannel");
			var customCustomerShipToModel = self.getView().getModel("customCustomerShipTo");

			if (currentView === viewTarget) {

				oGlobalModel.refresh(true); //Necessario per il formatter

				if (previousPageView === homePageView) { //quando navigo dalla HomePage a QuotationsDetails
					viewStateModel.setProperty("/iconSalesDataPage", IconColor.Default);
					viewStateModel.setProperty("/iconCustomerDataPage", IconColor.Default);
					viewStateModel.setProperty("/checkInputAfterPressSave", false);

					self.getView().byId("ProjectNameId").setValueState(Library.ValueState.None);
					self.getView().byId("TitlePoId").setValueState(Library.ValueState.None);
					self.getView().byId("QuotationDateId").setValueState(Library.ValueState.None);
					self.getView().byId("QuotationDateValidId").setValueState(Library.ValueState.None);
					self.getView().byId("StatusId").setValueState(Library.ValueState.None);

					self.getView().byId("CustomerId").setValueState(Library.ValueState.None);

					viewStateModel.setProperty("/listMaterials", []);
					viewStateModel.setProperty("/materialSearchString", "");
					viewStateModel.setProperty("/customerMaterialSearchString", "");
				}

				if (!oGlobalModel.getProperty("/createMode")) { //Se l'utente ha premuto un'item della smartTable recupero i valori
					if (previousPageView === homePageView) {

						self.getView().byId("idIconTabBarMulti").setSelectedKey(0);
						self.getView().byId("idIconTabBarMulti").setExpanded(true);

						/*BEGIN Header Info*/
						oGlobalModel.setProperty("/headerInfo/headerInfoQuotationNo", oGlobalModel.getProperty("/quotationSelected/QuotationNo"));
						oGlobalModel.setProperty("/headerInfo/headerInfoQuotationVersion", oGlobalModel.getProperty("/quotationSelected/Version"));
						oGlobalModel.setProperty("/headerInfo/headerInfoQuotationSalesCurrency", oGlobalModel.getProperty(
							"/quotationSelected/SalesCurrency"));
						oGlobalModel.setProperty("/headerInfo/headerInfoQuotationCustomerId", oGlobalModel.getProperty("/quotationSelected/CustomerId"));
						oGlobalModel.setProperty("/headerInfo/headerInfoQuotationCustomerName", oGlobalModel.getProperty(
							"/quotationSelected/CustomerName"));
						oGlobalModel.setProperty("/headerInfo/headerInfoQuotationStatus", oGlobalModel.getProperty("/quotationSelected/Status"));
						oGlobalModel.setProperty("/headerInfo/headerInfoQuotationCart", 0);
						oGlobalModel.setProperty("/headerInfo/headerInfoQuotationTitle", oGlobalModel.getProperty("/quotationSelected/Title"));
						oGlobalModel.setProperty("/headerInfo/headerInfoQuotationSAP", oGlobalModel.getProperty("/quotationSelected/SapQuotationNo"));
						/*END Header Info*/

						oGlobalModel.setProperty("/contributionMargin", {});

						oGlobalModel.setProperty("/quotationSelected/SalesPersonName", oGlobalModel.getProperty("/quotationSelected/SalesOffice") +
							" | " + oGlobalModel
							.getProperty(
								"/quotationSelected/SalesGroup"));

						viewStateModel.setProperty("/oldTitlePo", oGlobalModel.getProperty("/quotationSelected/Title")); //memorizzo il PO in modo tale da verificare se aprire o meno la pop-up "EnterTitlePo"

						viewStateModel.setProperty("/enableSalesManager", false);

						if (oGlobalModel.getProperty("/quotationSelected/CustomerId")) {
							viewStateModel.setProperty("/keepDataSAP", true); //se era presente un customer allora deve considerare quello
						} else {
							viewStateModel.setProperty("/keepDataSAP", false); //se l'utente non aveva selezionato il customer

							oGlobalModel.setProperty("/quotationSelected/ShipToParty", "");
							oGlobalModel.setProperty("/quotationSelected/ShipToPartyName", "");
							oGlobalModel.setProperty("/quotationSelected/ShipToAddressStreet", "");
							oGlobalModel.setProperty("/quotationSelected/ShipToAddressCity", "");
							oGlobalModel.setProperty("/quotationSelected/ShipToAddressPostcode", "");
							oGlobalModel.setProperty("/quotationSelected/ShipToAddressCountry", "");

							customCustomerContactPersonModel.setData([]);
							viewStateModel.setProperty("/enableBtnEditContactPerson", false);
							customCustomerDistributionChannelModel.setData([]);
							customCustomerShipToModel.setData([]);
						}

						self.getCustomerDistributionChannel();
						self.getQuotationItems();
						self.getCmConds();
						self.getManualConds();
						self.getDefaultMetals();

						oGlobalModel.setProperty("/contentTexts", []);
						viewStateModel.setProperty("/selContentText", "");
						customExtendedTextsModel.refresh(true);
						oGlobalModel.refresh(true);

						jQuery.when(
							self.getView().setBusy(true),
							self.getExtendedTexts()
						).done(function (par1, par2) {
							self.getContentTexts();
							self.getView().setBusy(false);
						}).fail(function (error) {
							self.getView().setBusy(false);
						});

					}
				} else {
					if (previousPageView === homePageView) {
						self.refreshData();
						self.getExtendedTexts();
						self.getManualConds();
					}
				}
			}
		},

		refreshData: function (oEvent) {
			var self = this;

			self.getView().byId("idIconTabBarMulti").setSelectedKey(0);
			self.getView().byId("idIconTabBarMulti").setExpanded(true);

			var viewStateModel = self.getView().getModel("viewState");
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var customCustomerContactPersonModel = self.getView().getModel("customCustomerContactPerson");
			var customCustomersModel = self.getView().getModel("customCustomers");
			var customCustomerDistributionChannelModel = self.getView().getModel("customCustomerDistributionChannel");
			var customCustomerShipToModel = self.getView().getModel("customCustomerShipTo");
			var customExtendedTextsModel = self.getView().getModel("customExtendedTexts");

			/*BEGIN Header Info*/
			oGlobalModel.setProperty("/headerInfo/headerInfoQuotationNo", "");
			oGlobalModel.setProperty("/headerInfo/headerInfoQuotationTitle", "");
			oGlobalModel.setProperty("/headerInfo/headerInfoQuotationVersion", "");
			oGlobalModel.setProperty("/headerInfo/headerInfoQuotationSalesCurrency", oGlobalModel.getProperty("/userInfo/currency"));
			oGlobalModel.setProperty("/headerInfo/headerInfoQuotationStatus", "");
			oGlobalModel.setProperty("/headerInfo/headerInfoQuotationCustomerId", "");
			oGlobalModel.setProperty("/headerInfo/headerInfoQuotationCustomerName", "");
			oGlobalModel.setProperty("/headerInfo/headerInfoQuotationSAP", "");
			/*END Header Info*/

			oGlobalModel.setProperty("/quotationSelected/QuotationNo", "");
			oGlobalModel.setProperty("/quotationSelected/Version", "");
			oGlobalModel.setProperty("/quotationSelected/QuotationName", "");
			oGlobalModel.setProperty("/quotationSelected/Title", "");
			oGlobalModel.setProperty("/quotationSelected/Tag", "");
			oGlobalModel.setProperty("/quotationSelected/SapQuotationNo", "");

			oGlobalModel.setProperty("/quotationSelected/Bname", oGlobalModel.getProperty("/userInfo/userName"));

			oGlobalModel.getProperty("/salesGroups").forEach(function (x) {
				if (oGlobalModel.getProperty("/userInfo/salesOffice") === x.SalesOffice && oGlobalModel.getProperty(
						"/userInfo/salesGroup") === x.SalesGroup) {
					oGlobalModel.setProperty("/quotationSelected/SalesPersonName", x.SalesPersonName);
				}
			});

			viewStateModel.setProperty("/oldTitlePo", "");

			viewStateModel.setProperty("/enableSalesManager", true);
			viewStateModel.setProperty("/keepDataSAP", false);

			oGlobalModel.setProperty("/quotationSelected/QuotationDate", new Date());
			oGlobalModel.setProperty("/quotationSelected/QuotationValid", "");

			oGlobalModel.setProperty("/quotationSelected/Status", "Draft");

			oGlobalModel.setProperty("/quotationSelected/CustomerId", "");
			oGlobalModel.setProperty("/quotationSelected/CustomerName", "");
			oGlobalModel.setProperty("/quotationSelected/CustomerAddressStreet", "");
			oGlobalModel.setProperty("/quotationSelected/CustomerAddressCity", "");
			oGlobalModel.setProperty("/quotationSelected/CustomerAddressPostcode", "");
			oGlobalModel.setProperty("/quotationSelected/CustomerAddressCountry", "");

			oGlobalModel.setProperty("/quotationSelected/DistributionChannel", oGlobalModel.getProperty("/userInfo/distributionChannel"));
			oGlobalModel.setProperty("/quotationSelected/SalesOrganization", oGlobalModel.getProperty("/userInfo/salesOrganization"));

			// oGlobalModel.setProperty("/quotationSelected/PaymentTerm", "");
			// oGlobalModel.setProperty("/quotationSelected/PaymentTermName", "");

			// oGlobalModel.setProperty("/quotationSelected/DeliveryTerm", "");
			// oGlobalModel.setProperty("/quotationSelected/DeliveryTerm2", "");

			oGlobalModel.setProperty("/quotationSelected/ShipToParty", "");
			oGlobalModel.setProperty("/quotationSelected/ShipToPartyName", "");
			oGlobalModel.setProperty("/quotationSelected/ShipToAddressStreet", "");
			oGlobalModel.setProperty("/quotationSelected/ShipToAddressCity", "");
			oGlobalModel.setProperty("/quotationSelected/ShipToAddressPostcode", "");
			oGlobalModel.setProperty("/quotationSelected/ShipToAddressCountry", "");

			oGlobalModel.setProperty("/quotationSelected/Language", oGlobalModel.getProperty("/userInfo/language"));
			oGlobalModel.setProperty("/quotationSelected/CompanyCode", oGlobalModel.getProperty("/userInfo/companyCode"));
			oGlobalModel.setProperty("/quotationSelected/SalesCurrency", oGlobalModel.getProperty("/userInfo/currency"));
			oGlobalModel.setProperty("/quotationSelected/SalesOffice", oGlobalModel.getProperty("/userInfo/salesOffice"));
			oGlobalModel.setProperty("/quotationSelected/SalesGroup", oGlobalModel.getProperty("/userInfo/salesGroup"));

			customCustomerContactPersonModel.setData([]);
			viewStateModel.setProperty("/enableBtnEditContactPerson", false);

			customCustomersModel.setData([]);
			customCustomerDistributionChannelModel.setData([]);
			customCustomerShipToModel.setData([]);

			oGlobalModel.setProperty("/contentTexts", []);
			viewStateModel.setProperty("/selContentText", "");
			customExtendedTextsModel.refresh(true);
			oGlobalModel.refresh(true);
		},

		navToHome: function (oEvent) {
			var self = this;

			self.getRouter().navTo("HomePage");
		},

		getCurrencies: function (oEvent) {
			var self = this;
			var viewStateModel = self.getView().getModel("viewState");
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			self.getOwnerComponent().getModel("oDataModel").read("/CurrencySet", {
				async: false,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {
						oGlobalModel.setProperty("/currencies", oData.results);
						oGlobalModel.refresh();

						viewStateModel.setProperty("/selCurrencyCode", oData.results[0].CurrCode);
						viewStateModel.setProperty("/selCurrencyName", oData.results[0].CurrName);
					} else {
						oGlobalModel.setProperty("/currencies", []);
						oGlobalModel.refresh();
					}
				},
				error: function (result, b) {
					oGlobalModel.setProperty("/currencies", []);
					oGlobalModel.refresh();
					MessageToast.show(result.message);
				}
			});
		},

		getQuotationItems: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var filter = [];

			filter.push(new Filter({
				path: "QuotationNo",
				operator: FilterOperator.EQ,
				value1: oGlobalModel.getProperty("/quotationSelected/QuotationNo")
			}));

			filter.push(new Filter({
				path: "Version",
				operator: FilterOperator.EQ,
				value1: oGlobalModel.getProperty("/quotationSelected/Version")
			}));

			self.getView().setBusyIndicatorDelay(0);
			self.getView().setBusy(true);
			self.getOwnerComponent().getModel("oDataModel").read("/QuotationItemSet", {
				filters: filter,
				async: false,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {
						oGlobalModel.setProperty("/cart", oData.results);
						self.getItemPricing();
						self.getItemChars();
					} else {
						oGlobalModel.setProperty("/cart", []);
					}

					oGlobalModel.setProperty("/headerInfo/headerInfoQuotationCart", oGlobalModel.getProperty("/cart").length);
					self.getView().setBusy(false);
				},
				error: function (result, b) {
					oGlobalModel.setProperty("/cart", []);
					oGlobalModel.setProperty("/headerInfo/headerInfoQuotationCart", oGlobalModel.getProperty("/cart").length);
					self.getView().setBusy(false);
					MessageToast.show(result.message);

				}
			});
		},

		getItemPricing: function () {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel"),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				cart = oGlobalModel.getProperty("/cart"),
				oDataFilters = [];

			oDataFilters.push(new sap.ui.model.Filter("QuotationNo", sap.ui.model.FilterOperator.EQ, oGlobalModel.getProperty(
				"/quotationSelected/QuotationNo")));
			oDataFilters.push(new sap.ui.model.Filter("Version", sap.ui.model.FilterOperator.EQ, oGlobalModel.getProperty(
				"/quotationSelected/Version")));

			self.getView().setBusy(true);

			oModel.read("/MaterialPricingItemsSet", {
				filters: oDataFilters,
				async: true,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {
						cart.forEach(function (item) {
							item.Pricing = [];
							oData.results.forEach(function (x) {
								if (x.ItemNo === item.ItemNo) {
									x.Manual = true;
									item.Pricing.push(x);
								}
							});
						});
						oGlobalModel.setProperty("/cart", cart);
						self.getView().setBusy(false);
					} else {
						cart.forEach(function (item) {
							item.Pricing = [];
						});
					}
				},
				error: function (result, b) {
					cart.forEach(function (item) {
						item.Pricing = [];
					});
					self.getView().setBusy(false);
					//MessageToast.show(result.message);
				}
			});
		},
		getCmConds: function () {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel"),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				oDataFilters = [];

			/*oDataFilters.push(new sap.ui.model.Filter("Auart", sap.ui.model.FilterOperator.EQ, oGlobalModel.getProperty(
				"/quotationSelected/OrderType")));*/
			oDataFilters.push(new sap.ui.model.Filter("Auart", sap.ui.model.FilterOperator.EQ, oGlobalModel.getProperty(
				"/userInfo/salesDocumentType")));
			oDataFilters.push(new sap.ui.model.Filter("Vkorg", sap.ui.model.FilterOperator.EQ, oGlobalModel.getProperty(
				"/quotationSelected/SalesOrganization")));

			self.getView().setBusy(true);

			oModel.read("/CondContributionMarginSet", {
				filters: oDataFilters,
				async: true,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {
						oGlobalModel.setProperty("/contributionMargin/condList", oData.results);
						oGlobalModel.setProperty("/contributionMargin/SelectedCondType", oData.results[0].Kschl);
						self.getView().setBusy(false);
					}
				},
				error: function (result, b) {
					self.getView().setBusy(false);
					//MessageToast.show(result.message);
				}
			});
		},
		getManualConds: function () {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel"),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				oDataFilters = [];

			oDataFilters.push(new sap.ui.model.Filter("Kunnr", sap.ui.model.FilterOperator.EQ, oGlobalModel.getProperty(
				"/quotationSelected/QuotationNo/CustomerId")));

			self.getView().setBusy(true);

			oModel.read("/ManualConditionsSet", {
				filters: oDataFilters,
				async: true,
				success: function (oData, result) {
					self.getView().setBusy(false);
					oGlobalModel.setProperty("/manualConditions", oData.results);
					oGlobalModel.setProperty("/manualConditionsOrig", oData.results);
					oGlobalModel.setProperty("/selectedManualCond", {});
				},
				error: jQuery.proxy(function (err) {
					self.getView().setBusy(false);
					var msg = "";
					var objerror = jQuery.parseJSON(err.responseText); //.error.message.value
					if (objerror && objerror.error && objerror.error.message && objerror.error.message.value) {
						msg = objerror.error.message.value;
					}
					if (msg !== "") {
						MessageBox.show(msg, MessageBox.Icon.ERROR);
					}
				}, this)
			});

		},
		getDefaultMetals: function () {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel"),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				header = oGlobalModel.getProperty("/quotationSelected");

			self.getView().setBusy(true);

			var obj = {
				QuotationNo: header.QuotationNo,
				Version: header.Version,
				Kunnr: header.CustomerId,
				MetalsBasesSet: [],
				MetalsConditionsSet: [],
				MetalsCoverageTabSet: [],
				MetalsCustomTabSet: [],
				MetalsCustomTabValuesSet: []
			};

			oModel.create("/MetalsDefaultsSet", obj, {
				async: true,
				success: function (result) {
					self.getView().setBusy(false);

					if (result) {
						var customizing = {},
							coverage = {},
							bases = {},
							canEditBaseKey = {};

						result.MetalsConditionsSet.results.forEach(function (x) {
							var custom;
							//x.NfsUnbinded = x.Nfs; SP comment
							x.Bcu = oGlobalModel.getProperty("/userInfo/currency");

							if (x.Ndt && x.Ndt !== "00000000") {
								//x.NdtParsed =  x.Ndt.convertDate({outputDate: true}); SP comment
							} else {
								// x.NdtParsed = new Date(); SP comment
							}

							if (x.Nfs) {
								if (result.MetalsCustomTabSet &&
									result.MetalsCustomTabSet.results.length &&
									result.MetalsCustomTabSet.results.length > 0) {

									custom = result.MetalsCustomTabSet.results.filter(function (y) {
										return y.Nfs === x.Nfs;
									})[0];
								}
								if (custom) {
									oGlobalModel.setProperty("/metalsInfo/selectedCustomKey", custom.Nfs);
								}
							}
							if (x.Neb === "99") {
								canEditBaseKey[x.Nes] = true;
							} else {
								canEditBaseKey[x.Nes] = false;
							}
							bases[x.Nes] = result.MetalsBasesSet.results.filter(function (y) {
								return y.Nes === x.Nes;
							});
						});

						oGlobalModel.setProperty("/metalsInfo/bases", bases);
						oGlobalModel.setProperty("/metalsInfo/canEditBaseKey", canEditBaseKey);
						oGlobalModel.setProperty("/metalsInfo/backupCanEditBaseKey", $.extend(true, {}, canEditBaseKey));
						oGlobalModel.setProperty("/metalsInfo/conditions", result.MetalsConditionsSet.results);
						oGlobalModel.setProperty("/metalsInfo/backupConditions", $.extend(true, [], result.MetalsConditionsSet.results));

						if (result.MetalsCustomTabSet &&
							result.MetalsCustomTabSet.results.length &&
							result.MetalsCustomTabSet.results.length > 0) {
							result.MetalsCustomTabSet.results.forEach(function (item) {
								customizing[item.Nfs] = item;
								item.Custom = result.MetalsCustomTabValuesSet.results.filter(function (x) {
									return x.Nfs === item.Nfs;
								});
								item.Custom.forEach(function (x) {
									var current = customizing[item.Nfs][x.Fname] = {};
									if (x.Fname.toUpperCase() === "BWR" || x.Fname.toUpperCase() === "BSL" || x.Fname.toUpperCase() === "BCU") {
										current.enabled = false;
										current.mandatory = false;
										current.visible = true;
									} else {
										current.enabled = (x.Can === "X") || (x.Must === "X");
										current.mandatory = x.Must === "X";
										current.visible = x.Invis !== "X";
									}

								});

							});

							oGlobalModel.setProperty("/metalsInfo/customizingTab", result.MetalsCustomTabSet.results);
							oGlobalModel.setProperty("/metalsInfo/customizing", customizing);
							oGlobalModel.setProperty("/metalsInfo/backupCustomizing", $.extend(true, {}, customizing));

						}
						if (result.MetalsCoverageTabSet &&
							result.MetalsCoverageTabSet.results.length &&
							result.MetalsCoverageTabSet.results.length > 0) {
							result.MetalsCoverageTabSet.results.forEach(function (x) {
								if (!coverage[x.Nes]) {
									coverage[x.Nes] = [];
								}
								coverage[x.Nes].push(x);
							});
							oGlobalModel.setProperty("/metalsInfo/coverage", coverage);
						}
						if (result.MetalsConditionsSet.results.length > 0) {
							oGlobalModel.setProperty("/metalsInfo/status", true);
						}
					}
				},
				error: function (result, b) {
					self.getView().setBusy(false);
				}
			});
		},

		/********BEGIN SAVE********/

		pressSave: function (oEvent) {
			var self = this;
			var viewStateModel = self.getView().getModel("viewState");
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			var flagRequiredFields = false;

			// if (!oGlobalModel.getProperty("/quotationSelected/SapQuotationNo")) { //se la quotation NON è stata salvata su SAP

			flagRequiredFields = self.checkRequiredFieldsBC();

			if (oGlobalModel.getProperty("/createMode")) {
				self.onSaveQuoteBC("C");
			} else {
				self.onSaveQuoteBC("E");
			}

			// } else { //se la quotation è stata salvata su SAP
			// 	if (oGlobalModel.getProperty("/quotationSelected/Status") === "Lost") {
			// 		self.lostQuotation();
			// 	}
			// }
		},

		/*	lostQuotation: function (oEvent) {
				var self = this;
				var oModel = self.getOwnerComponent().getModel("oDataModel");
				var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
				var obj = {
					QuotationNo: oGlobalModel.getProperty("/quotationSelected/QuotationNo"),
					Version: oGlobalModel.getProperty("/quotationSelected/Version"),
					Status: "Lost",
					SapQuotationNo: oGlobalModel.getProperty("/quotationSelected/SapQuotationNo"),
					BapiRet2Set: []
				};

				self.getView().setBusyIndicatorDelay(0);
				self.getView().setBusy(true);

				oModel.create("/QuotationStatusSet", obj, {
					success: function (oData, oResponse) {

						self.getView().setBusy(false);
					},
					error: function () {
						self.getView().setBusy(false);
					}
				});

			},*/

		pressSaveNewVersion: function (oEvent) {
			var self = this;

			self.saveNewVersion();
		},

		saveNewVersion: function (newPo) {
			var self = this;

			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var viewStateModel = self.getView().getModel("viewState");

			// var flagSalesDataPage = false,
			// 	flagCustomerDataPage = false;

			// flagSalesDataPage = self.checkSalesDataPage();
			// flagCustomerDataPage = self.checkCustomerDataPage();

			// if (flagSalesDataPage && flagCustomerDataPage) {
			self.onSaveQuoteBC("C");
			// } else {
			// 	viewStateModel.setProperty("/checkInputAfterPressSave", true); //da ora in poi fa i controlli sui campi di input
			// }
		},

		/********END SAVE********/

		/********BEGIN CHECK PAGES********/

		checkSalesDataPage: function (oEvent) {
			var self = this;

			var viewStateModel = self.getView().getModel("viewState");

			var flagQuotationDate = false,
				flagQuotationValid = false,
				flagTitlePo = false,
				flagProjectName = false,
				flagStatus = false;

			var quotationDate = self.getView().byId("QuotationDateId").getValue();
			var quotationDateValid = self.getView().byId("QuotationDateValidId").getValue();

			flagQuotationDate = self.checkDataFormat(quotationDate);

			if (!flagQuotationDate) {
				self.getView().byId("QuotationDateId").setValueState(Library.ValueState.Error);
			} else {
				self.getView().byId("QuotationDateId").setValueState(Library.ValueState.None);
			}

			flagQuotationValid = self.checkDataFormat(quotationDateValid);

			if (!flagQuotationValid) {
				self.getView().byId("QuotationDateValidId").setValueState(Library.ValueState.Error);
			} else {
				self.getView().byId("QuotationDateValidId").setValueState(Library.ValueState.None);
			}

			flagTitlePo = self.checkTitlePo();

			flagProjectName = self.checkProjectName();

			flagStatus = self.checkStatus();

			if (flagQuotationDate && flagQuotationValid && flagTitlePo && flagProjectName && flagStatus) {
				viewStateModel.setProperty("/iconSalesDataPage", IconColor.Default);
				return true;
			} else {
				viewStateModel.setProperty("/iconSalesDataPage", IconColor.Negative);
				return false;
			}
		},

		checkCustomerDataPage: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var viewStateModel = self.getView().getModel("viewState");

			if (oGlobalModel.getProperty("/quotationSelected/CustomerId")) {
				self.getView().byId("CustomerId").setValueState(Library.ValueState.None);
				viewStateModel.setProperty("/iconCustomerDataPage", IconColor.Default);
				return true;
			} else {
				self.getView().byId("CustomerId").setValueState(Library.ValueState.Error);
				viewStateModel.setProperty("/iconCustomerDataPage", IconColor.Negative);
				return false;
			}
		},

		/********END CHECK PAGES********/

		/********BEGIN CHECK FIELDS********/

		checkProjectName: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			if (!oGlobalModel.getProperty("/quotationSelected/QuotationName").trim()) {
				self.getView().byId("ProjectNameId").setValueState(Library.ValueState.Error);
				return false;
			} else {
				self.getView().byId("ProjectNameId").setValueState(Library.ValueState.None);
				return true;
			}
		},

		checkTitlePo: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			if (!oGlobalModel.getProperty("/quotationSelected/Title").trim()) {
				self.getView().byId("TitlePoId").setValueState(Library.ValueState.Error);
				return false;
			} else {
				self.getView().byId("TitlePoId").setValueState(Library.ValueState.None);
				return true;
			}
		},

		checkStatus: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			if (!oGlobalModel.getProperty("/quotationSelected/Status")) {
				self.getView().byId("StatusId").setValueState(Library.ValueState.Error);
				return false;
			} else {
				self.getView().byId("StatusId").setValueState(Library.ValueState.None);
				return true;
			}
		},

		/********END CHECK FIELDS********/

		/**********************  BEGIN SALES DATA **********************/
		getExtendedTexts: function (oEvent) {
			var self = this;
			var customExtendedTextsModel = self.getView().getModel("customExtendedTexts");
			var filter = [];
			var def = jQuery.Deferred();

			filter.push(new Filter({
				path: "Tdobject",
				operator: FilterOperator.EQ,
				value1: "VBBK"
			}));

			self.getOwnerComponent().getModel("oDataModel").read("/ExtendedTextsSet", {
				filters: filter,
				async: false,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {
						customExtendedTextsModel.setData(oData.results);
						customExtendedTextsModel.refresh(true);
						def.resolve();
					}
				},
				error: function (result, b) {
					customExtendedTextsModel.setData([]);
					customExtendedTextsModel.refresh();
					MessageToast.show(result.message);
					def.reject();
				}
			});
			return def;
		},

		getContentTexts: function (oEvent) {
			var self = this;
			var filter = [];
			var customExtendedTextsModel = self.getView().getModel("customExtendedTexts");
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var cart = oGlobalModel.getProperty("/cart");

			filter.push(new Filter({
				path: "ItmNumber",
				operator: FilterOperator.EQ,
				value1: "" //Testata
			}));

			if (oGlobalModel.getProperty("/quotationSelected/QuotationNo")) {
				filter.push(new Filter({
					path: "QuotationNo",
					operator: FilterOperator.EQ,
					value1: oGlobalModel.getProperty("/quotationSelected/QuotationNo")
				}));
			}

			if (oGlobalModel.getProperty("/quotationSelected/Version")) {
				filter.push(new Filter({
					path: "Version",
					operator: FilterOperator.EQ,
					value1: oGlobalModel.getProperty("/quotationSelected/Version")
				}));
			}

			self.getView().byId("extendedText").setSelectedIndex(0);

			self.getOwnerComponent().getModel("oDataModel").read("/ContentTextsSet", {
				filters: filter,
				async: false,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {

						oGlobalModel.setProperty("/contentTexts", oData.results.filter(function (x) {
							return x.ItmNumber === "000000";
						}));
						if (cart.length) {
							cart.forEach(function (x) {
								x.ContentTexts = [];
								x.ContentTexts = oData.results.filter(function (y) {
									return y.ItmNumber === x.ItemNo;
								})
							});
						}
						oGlobalModel.setProperty("/cart", cart);
						oGlobalModel.refresh(true);
						customExtendedTextsModel.refresh(true);
						self.getContentExtendedText(self.getView().byId("extendedText").getSelectedKey());
					}
				},
				error: function (result, b) {
					oGlobalModel.setProperty("/contentTexts", []);
					oGlobalModel.refresh();
					MessageToast.show(result.message);
				}
			});
		},

		changeProjectName: function (oEvent) {
			var self = this;
			var viewStateModel = self.getView().getModel("viewState");

			if (viewStateModel.getProperty("/checkInputAfterPressSave")) { //se l'utente ha premuto Save o Save New Version
				self.checkSalesDataPage();
			}
		},

		changeTitlePo: function (oEvent) {
			var self = this;
			var viewStateModel = self.getView().getModel("viewState");

			if (viewStateModel.getProperty("/checkInputAfterPressSave")) { //se l'utente ha premuto Save o Save New Version
				self.checkSalesDataPage();
			}
		},

		changeStatus: function (oEvent) {
			var self = this;
			var viewStateModel = self.getView().getModel("viewState");

			if (viewStateModel.getProperty("/checkInputAfterPressSave")) { //se l'utente ha premuto Save o Save New Version
				self.checkSalesDataPage();
			}
		},

		changeQuotationDate: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var viewStateModel = self.getView().getModel("viewState");
			var quotationDate = oEvent.getSource().getValue();
			var check = false;

			check = self.checkDataFormat(quotationDate);

			if (!check) {
				self.getView().byId("QuotationDateId").setValueState(Library.ValueState.Error);
				oGlobalModel.setProperty("/quotationSelected/QuotationDate", "");
			} else {
				self.getView().byId("QuotationDateId").setValueState(Library.ValueState.None);
				oGlobalModel.setProperty("/quotationSelected/QuotationDate", oEvent.getSource().getDateValue());
			}

			if (viewStateModel.getProperty("/checkInputAfterPressSave")) { //se l'utetnte ha premuto Save o Save New Version
				self.checkSalesDataPage();
			}
		},

		changeQuotationValid: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var viewStateModel = self.getView().getModel("viewState");
			var quotationDate = oEvent.getSource().getValue();
			var check = false;

			check = self.checkDataFormat(quotationDate);

			if (!check) {
				self.getView().byId("QuotationDateValidId").setValueState(Library.ValueState.Error);
				oGlobalModel.setProperty("/quotationSelected/QuotationValid", "");
			} else {
				self.getView().byId("QuotationDateValidId").setValueState(Library.ValueState.None);
				oGlobalModel.setProperty("/quotationSelected/QuotationValid", oEvent.getSource().getDateValue());
			}

			if (viewStateModel.getProperty("/checkInputAfterPressSave")) { //se l'utetnte ha premuto Save o Save New Version
				self.checkSalesDataPage();
			}
		},

		checkDataFormat: function (val) {
			var dataRegex = /(19|20)[0-9][0-9]-(0[0-9]|1[0-2])-(0[1-9]|([12][0-9]|3[01]))T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]/;

			if (!val) {
				return true;
			} else {
				if (!dataRegex.test(val)) {
					return false;
				} else {
					return true;
				}
			}
		},

		changeExtendedText: function (oEvent) {
			var self = this;

			var selComboBox = oEvent.getSource();

			var selExtendedTextCode = selComboBox.getSelectedKey();

			var selExtendedTextValue = selComboBox._getSelectedItemText();

			self.getContentExtendedText(selExtendedTextCode, selExtendedTextValue);
		},

		getContentExtendedText: function (textId, textValue) {
			var self = this;
			var flagEmpty = true; //Controllo se non c'è testo
			var viewStateModel = self.getView().getModel("viewState");
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var customExtendedTextsModel = self.getView().getModel("customExtendedTexts");

			viewStateModel.setProperty("/selExtendedTextCode", textId);
			viewStateModel.setProperty("/selExtendedTextValue", textValue);

			if (oGlobalModel.getProperty("/contentTexts").length) {
				oGlobalModel.getProperty("/contentTexts").forEach(function (x) {
					if (x.Tdid === textId) {
						viewStateModel.setProperty("/selContentText", x.Text);
						flagEmpty = false;
					}
				});
			}

			if (flagEmpty) {
				viewStateModel.setProperty("/selContentText", "");
			}

			customExtendedTextsModel.refresh(true);
		},

		changeContentText: function (oEvent) {
			var self = this;
			var viewStateModel = self.getView().getModel("viewState");
			var flag = false; //verifica che esiste già un content text associato all'extended text
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			if (viewStateModel.getProperty("/selExtendedTextCode")) {
				oGlobalModel.getProperty("/contentTexts").forEach(function (x) {
					if (x.Tdid === viewStateModel.getProperty("/selExtendedTextCode")) {
						x.Text = oEvent.getSource().getValue();
						flag = true;
					}
				});

				if (!flag) {
					if (!viewStateModel.getProperty("/selExtendedTextValue")) { //quando è selezionato il primo extended text di default
						self.getView().getModel("customExtendedTexts").getData().forEach(function (x) {
							if (x.Tdid === viewStateModel.getProperty("/selExtendedTextCode")) {
								viewStateModel.setProperty("/selExtendedTextValue", x.Tdtext);
							}
						});
					}

					oGlobalModel.getProperty("/contentTexts").push({
						QuotationNo: oGlobalModel.getProperty("/quotationSelected/QuotationNo") ? oGlobalModel.getProperty(
							"/quotationSelected/QuotationNo") : "",
						Version: oGlobalModel.getProperty("/quotationSelected/Version") ? oGlobalModel.getProperty(
							"/quotationSelected/Version") : "",
						ItmNumber: "000000",
						Langu: oGlobalModel.getProperty("/userInfo/language"),
						Tdid: viewStateModel.getProperty("/selExtendedTextCode"),
						Tdtext: viewStateModel.getProperty("/selExtendedTextValue"),
						Text: oEvent.getSource().getValue()

					});
				}

			}
			self.getView().getModel("customExtendedTexts").refresh(true);
		},

		changeCurrency: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var viewStateModel = self.getView().getModel("viewState");
			var oNF5 = sap.ui.core.format.NumberFormat.getFloatInstance({
				maxFractionDigits: 5,
				minFractionDigits: 5,
				decimalSeparator: "."
			});
			var selCurrency = oEvent.getParameter("selectedItem").getKey();

			if (selCurrency === oGlobalModel.getProperty("/userInfo/currency")) {
				viewStateModel.setProperty("/valueCurrency", "1.000000");
			} else {
				var curModel = new JSONModel();
				var quoteDate = this.getView().byId("QuotationDateId").getProperty("value");
				var newRate = 0;
				var gccRate = 0;
				var sRate = 0;
				var path = "/sap/opu/odata/SAP/ZOTC_EASYQUOTE_SRV";
				var txt = self.getView().getModel("i18n").getResourceBundle().getText("rateNotFound");

				if (oGlobalModel.getProperty("/userInfo/currency") !== "EUR" && selCurrency !== "EUR") {
					// Convert to EUR first
					curModel.loadData(path + "/CurrencyRateSet(CurrCode='" + oGlobalModel.getProperty("/userInfo/currency") +
						"',CurrDate=datetime'" +
						quoteDate + "')",
						"", false);
					if (curModel.oData.d) {
						gccRate = curModel.oData.d.CurrRate;
						curModel.loadData(path + "/CurrencyRateSet(CurrCode='" + selCurrency + "',CurrDate=datetime'" + quoteDate + "')",
							"", false);
						if (curModel.oData.d) {
							sRate = curModel.oData.d.CurrRate;
							newRate = oNF5.format(sRate / gccRate);
						} else {
							MessageBox.warning(txt);
							newRate = "1.00000";
						}
					} else {
						MessageBox.warning(txt);
						newRate = "1.00000";
					}
				} else if (oGlobalModel.getProperty("/userInfo/currency") != "EUR") {
					curModel.loadData(path + "/CurrencyRateSet(CurrCode='" + oGlobalModel.getProperty("/userInfo/currency") +
						"',CurrDate=datetime'" +
						quoteDate + "')",
						"", false);
					if (curModel.oData.d) {
						newRate = oNF5.format(1 / curModel.oData.d.CurrRate);
					} else {
						MessageBox.warning(txt);
						newRate = "1.00000";
					}
				} else {
					curModel.loadData(path + "/CurrencyRateSet(CurrCode='" + selCurrency + "',CurrDate=datetime'" + quoteDate + "')", "",
						false);
					if (curModel.oData.d) {
						newRate = curModel.oData.d.CurrRate;
					} else {
						MessageBox.warning(txt);
						newRate = "1.00000";
					}
				}
				viewStateModel.setProperty("/valueCurrency", newRate);
			}

			// this.onNewCurr(oEvent); //TO-DO

		},

		/**********************  END SALES DATA **********************/

		/**********************  BEGIN CUSTOMER DATA **********************/
		handleValueHelpCustomer: function (oEvent) {
			var self = this;
			var customCustomersModel = self.getView().getModel("customCustomers");

			if (!self.fragmentCustomerSearchHelp) {
				self.fragmentCustomerSearchHelp = sap.ui.xmlfragment(self.getView().getId(),
					"zotc_easyquote.zotc_easyquote.fragment.CustomerSearchHelp",
					self);
				self.getView().addDependent(self.fragmentCustomerSearchHelp);
			}

			customCustomersModel.setData([]);
			customCustomersModel.refresh();

			self.fragmentCustomerSearchHelp.open();
		},

		handleSearchCustomer: function (oEvent) {
			var self = this;
			var customCustomersModel = self.getView().getModel("customCustomers");
			var sValue = oEvent.getParameter("value");

			if (sValue.length >= 5) { //L'utente deve digitare almeno 5 digit per avviare la ricerca
				self.getCustomersSearch(sValue);
			} else {
				var txt = self.getView().getModel("i18n").getResourceBundle().getText("enter5Characters");
				MessageToast.show(txt, {
					duration: 1000,
					animationDuration: 1000
				});
				jQuery(".sapMMessageToast").addClass("sapMMessageToastWarning");

				customCustomersModel.setData([]);
				customCustomersModel.refresh();
			}
		},

		handleSelectCustomer: function (oEvent) {
			var self = this;
			var customCustomerModel = self.getView().getModel("customCustomers");
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			if (oEvent.getParameter("selectedItem")) {
				var oItem = oEvent.getParameter("selectedItem").getBindingContext("customCustomers");
				var path = oItem.getPath();
				var customerId = customCustomerModel.getProperty(path + "/ExternalKey");
				var name = customCustomerModel.getProperty(path + "/Name");
				var street = customCustomerModel.getProperty(path + "/Street");
				var city = customCustomerModel.getProperty(path + "/City");
				var postCode = customCustomerModel.getProperty(path + "/PostlCod1");
				var country = customCustomerModel.getProperty(path + "/Land1");

				oGlobalModel.setProperty("/quotationSelected/CustomerId", customerId);
				oGlobalModel.setProperty("/quotationSelected/CustomerName", name);
				oGlobalModel.setProperty("/quotationSelected/CustomerAddressStreet", street);
				oGlobalModel.setProperty("/quotationSelected/CustomerAddressCity", city);
				oGlobalModel.setProperty("/quotationSelected/CustomerAddressPostcode", postCode);
				oGlobalModel.setProperty("/quotationSelected/CustomerAddressCountry", country);

				self.checkCustomerDataPage();

				self.getCustomerDistributionChannel();
				self.getDefaultMetals();
			}
		},

		getCustomersSearch: function (sValue) {
			var self = this;
			var customCustomerModel = self.getView().getModel("customCustomers");
			var filter = [];

			filter.push(new Filter({
				path: "Searchstring",
				operator: FilterOperator.EQ,
				value1: sValue
			}));

			filter.push(new Filter({
				path: "RegAcgrT",
				operator: FilterOperator.EQ,
				value1: "X"
			}));

			filter.push(new Filter({
				path: "Cockpit",
				operator: FilterOperator.EQ,
				value1: " "
			}));

			filter.push(new Filter({
				path: "Blocked",
				operator: FilterOperator.EQ,
				value1: " "
			}));

			filter.push(new Filter({
				path: "Parvw",
				operator: FilterOperator.EQ,
				value1: "AG"
			}));

			self.fragmentCustomerSearchHelp.setBusyIndicatorDelay(0);
			self.fragmentCustomerSearchHelp.setBusy(true);

			self.getOwnerComponent().getModel("oDataModel").read("/CustomerSearchSet", {
				filters: filter,
				async: false,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {
						customCustomerModel.setData(oData.results);
						customCustomerModel.refresh();
						self.fragmentCustomerSearchHelp.setBusy(false);
					} else {
						customCustomerModel.setData([]);
						customCustomerModel.refresh();
						self.fragmentCustomerSearchHelp.setBusy(false);
					}
				},
				error: function (result, b) {
					MessageToast.show(result.message);
					self.fragmentCustomerSearchHelp.setBusy(false);
				}
			});
		},

		getCustomerDistributionChannel: function () {
			var self = this;
			var customCustomerDistributionChannelModel = self.getView().getModel("customCustomerDistributionChannel");
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var viewStateModel = self.getView().getModel("viewState");
			var filter = [];

			filter.push(new Filter({
				path: "Customerid",
				operator: FilterOperator.EQ,
				value1: oGlobalModel.getProperty("/quotationSelected/CustomerId")
			}));

			filter.push(new Filter({
				path: "Salesorganization",
				operator: FilterOperator.EQ,
				value1: oGlobalModel.getProperty("/quotationSelected/SalesOrganization")
			}));

			self.getView().setBusyIndicatorDelay(0);
			self.getView().setBusy(true);
			self.getOwnerComponent().getModel("oDataModel").read("/CustomerDistributionChannelSet", {
				filters: filter,
				async: false,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {

						customCustomerDistributionChannelModel.setData(oData.results);
						customCustomerDistributionChannelModel.refresh();

						oGlobalModel.setProperty("/quotationSelected/SalesOrganization", oData.results[0].Salesorganization);

						if (!viewStateModel.getProperty("/keepDataSAP")) {
							oGlobalModel.setProperty("/quotationSelected/DistributionChannel", oData.results[0].Distributionchannel);

							oGlobalModel.setProperty("/quotationSelected/PaymentTerm", oData.results[0].Customerpaymentterms);
							oGlobalModel.setProperty("/quotationSelected/PaymentTermName", oData.results[0].Customerpaymenttermsname);

							oGlobalModel.setProperty("/quotationSelected/DeliveryTerm", oData.results[0].Customerdeliveryterms);

							oGlobalModel.getProperty("/deliveryTerms").forEach(function (x) {
								if (x.Incoterm === oGlobalModel.getProperty("/quotationSelected/DeliveryTerm")) {
									oGlobalModel.setProperty("/quotationSelected/DeliveryTerm2", x.Incotermname);
								}
							});
						}

						jQuery.when(
							self.getCustomersShipTo()
						).done(function (par1, par2) {
							self.getCustomersContactPerson();

						}).fail(function (error) {
							self.getView().setBusy(false);
						});
					} else {
						self.getView().setBusy(false);
					}
				},
				error: function (result, b) {
					customCustomerDistributionChannelModel.setData([]);
					customCustomerDistributionChannelModel.refresh();
					self.getView().setBusy(false);
					MessageToast.show(result.message);
				}
			});
		},

		getCustomersShipTo: function () {
			var self = this;
			var viewStateModel = self.getView().getModel("viewState");
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var customCustomerShipToModel = self.getView().getModel("customCustomerShipTo");
			var filter = [];
			var def = jQuery.Deferred();

			filter.push(new Filter({
				path: "Customerid",
				operator: FilterOperator.EQ,
				value1: oGlobalModel.getProperty("/quotationSelected/CustomerId")
			}));

			filter.push(new Filter({
				path: "Distributionchannel",
				operator: FilterOperator.EQ,
				value1: oGlobalModel.getProperty("/quotationSelected/DistributionChannel")
			}));

			filter.push(new Filter({
				path: "Salesorganization",
				operator: FilterOperator.EQ,
				value1: oGlobalModel.getProperty("/quotationSelected/SalesOrganization")
			}));

			self.getOwnerComponent().getModel("oDataModel").read("/CustomerShipToSet", {
				filters: filter,
				async: false,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {

						customCustomerShipToModel.setData(oData.results);
						customCustomerShipToModel.refresh();

						if (!viewStateModel.getProperty("/keepDataSAP")) { //se ho cliccato un item della smartTable devo considerare i dati ti SAP
							oGlobalModel.setProperty("/quotationSelected/ShipToParty", oData.results[0].Shiptoparty);
							oGlobalModel.setProperty("/quotationSelected/ShipToPartyName", oData.results[0].Customername1);
							oGlobalModel.setProperty("/quotationSelected/ShipToAddressStreet", oData.results[0].Customeraddressstreet);
							oGlobalModel.setProperty("/quotationSelected/ShipToAddressCity", oData.results[0].Customeraddresscity);
							oGlobalModel.setProperty("/quotationSelected/ShipToAddressPostcode", oData.results[0].Customeraddresspostcode);
							oGlobalModel.setProperty("/quotationSelected/ShipToAddressCountry", oData.results[0].Customeraddresscountry);
						}
						viewStateModel.setProperty("/keepDataSAP", false);

						def.resolve();
					}
				},
				error: function (result, b) {
					self.getView().setBusy(false);
					customCustomerShipToModel.setData([]);
					customCustomerShipToModel.refresh();
					MessageToast.show(result.message);
					def.reject();
				}
			});
			return def;
		},

		getCustomersContactPerson: function () {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var viewStateModel = self.getView().getModel("viewState");
			var customCustomerContactPersonModel = self.getView().getModel("customCustomerContactPerson");
			var filter = [];
			var def = jQuery.Deferred();
			var flagEnableEdit = false;

			filter.push(new Filter({
				path: "Customerid",
				operator: FilterOperator.EQ,
				value1: oGlobalModel.getProperty("/quotationSelected/CustomerId")
			}));

			self.getOwnerComponent().getModel("oDataModel").read("/CustomerContactPersonSet", {
				filters: filter,
				async: false,
				success: function (oData, result) {
					if (result && result.data && result.data.results && result.data.results.length !== 0) {

						customCustomerContactPersonModel.setData(oData.results);

						customCustomerContactPersonModel.setData(oData.results.filter(function (x) {
							return x.Deleted !== 'X';
						}));
						customCustomerContactPersonModel.refresh();

						customCustomerContactPersonModel.getData().forEach(function (x) {
							if (x.Contactpersonfromsap !== 'X') {
								flagEnableEdit = true;
							}
						});

						if (flagEnableEdit) {
							viewStateModel.setProperty("/enableBtnEditContactPerson", true);
						} else {
							viewStateModel.setProperty("/enableBtnEditContactPerson", false);
						}

						def.resolve();
						self.getView().setBusy(false);
					} else {
						self.getView().setBusy(false);
					}
				},
				error: function (result, b) {
					customCustomerContactPersonModel.setData([]);
					customCustomerContactPersonModel.refresh();
					self.getView().setBusy(false);
					MessageToast.show(result.message);
					def.reject();
				}
			});
			return def;
		},

		changeCustomerShipToParty: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var customCustomerShipToModel = self.getView().getModel("customCustomerShipTo");

			var selComboBox = oEvent.getSource();

			var selCustomerShipToParty = selComboBox.getSelectedKey();

			customCustomerShipToModel.getData().forEach(function (x) {
				if (x.Shiptoparty === selCustomerShipToParty) {
					oGlobalModel.setProperty("/quotationSelected/ShipToParty", x.Shiptoparty);
					oGlobalModel.setProperty("/quotationSelected/ShipToPartyName", x.Customername1);
					oGlobalModel.setProperty("/quotationSelected/ShipToAddressStreet", x.Customeraddressstreet);
					oGlobalModel.setProperty("/quotationSelected/ShipToAddressCity", x.Customeraddresscity);
					oGlobalModel.setProperty("/quotationSelected/ShipToAddressPostcode", x.Customeraddresspostcode);
					oGlobalModel.setProperty("/quotationSelected/ShipToAddressCountry", x.Customeraddresscountry);
				}
			});
		},

		changeDeliveryTerms: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			var selComboBox = oEvent.getSource();

			var selDeliveryTerms = selComboBox.getSelectedKey();

			oGlobalModel.getProperty("/deliveryTerms").forEach(function (x) {
				if (x.Incoterm === selDeliveryTerms) {
					oGlobalModel.setProperty("/quotationSelected/DeliveryTerm", x.Incoterm);

					oGlobalModel.setProperty("/quotationSelected/DeliveryTerm2", x.Incotermname);
				}
			});
		},

		changePaymentTerms: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			var selComboBox = oEvent.getSource();

			var selPaymentTerms = selComboBox.getSelectedKey();

			oGlobalModel.getProperty("/paymentTerms").forEach(function (x) {
				if (x.Paymentterm === selPaymentTerms) {
					oGlobalModel.setProperty("/quotationSelected/PaymentTerm", x.Paymentterm);
					oGlobalModel.setProperty("/quotationSelected/PaymentTermName", x.Paymenttermname);
				}
			});
		},

		changeCountry: function (oEvent) {
			var self = this;
			var key = oEvent.getSource().getSelectedKey();
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			oGlobalModel.setProperty("/quotationSelected/ShipToAddressCountry", key);
		},

		changeContactPerson: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var key = oEvent.getSource().getSelectedKey(); //key format -> ContactPerson+ContactPersonFromSap

			if (key.substr(key.length - 1) === 'X') {
				oGlobalModel.setProperty("/quotationSelected/ContactPersonFromSap", "X");
				oGlobalModel.setProperty("/quotationSelected/ContactPerson", key.substring(0, key.length - 1));
			} else {
				oGlobalModel.setProperty("/quotationSelected/ContactPersonFromSap", "");
				oGlobalModel.setProperty("/quotationSelected/ContactPerson", key);
			}
		},

		openCreateContactPerson: function (oEvent) {
			var self = this;

			if (!self.fragmentCreateContactPerson) {
				self.fragmentCreateContactPerson = sap.ui.xmlfragment(self.getView().getId(),
					"zotc_easyquote.zotc_easyquote.fragment.CreateContactPerson",
					self);
				self.getView().addDependent(self.fragmentCreateContactPerson);
			}

			self.fragmentCreateContactPerson.open();

			var firstNameCCP = self.getView().byId("firstNameCCP");
			var lastNameCCP = self.getView().byId("lastNameCCP");
			var emailCCP = self.getView().byId("emailCCP");
			var phoneNumberCCP = self.getView().byId("phoneNumberCCP");

			firstNameCCP.setValue("");
			lastNameCCP.setValue("");
			emailCCP.setValue("");
			phoneNumberCCP.setValue("");

			firstNameCCP.setValueState(Library.ValueState.None);
			lastNameCCP.setValueState(Library.ValueState.None);
			emailCCP.setValueState(Library.ValueState.None);
			phoneNumberCCP.setValueState(Library.ValueState.None);
		},

		addCreateContactPerson: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var flag = true; //Check validity of input fields
			var data = {};

			var firstNameCCP = self.getView().byId("firstNameCCP");
			var lastNameCCP = self.getView().byId("lastNameCCP");
			var emailCCP = self.getView().byId("emailCCP");
			var phoneNumberCCP = self.getView().byId("phoneNumberCCP");

			if (!firstNameCCP.getValue()) {
				flag = false;
				firstNameCCP.setValueState(Library.ValueState.Error);
			} else {
				firstNameCCP.setValueState(Library.ValueState.None);
			}

			if (!lastNameCCP.getValue()) {
				flag = false;
				lastNameCCP.setValueState(Library.ValueState.Error);
			} else {
				lastNameCCP.setValueState(Library.ValueState.None);
			}

			if (!self.validateEmailBC(emailCCP)) {
				flag = false;
				emailCCP.setValueState(Library.ValueState.Error);
			} else {
				emailCCP.setValueState(Library.ValueState.None);
			}

			if (!self.validatePhoneBC(phoneNumberCCP)) {
				flag = false;
				phoneNumberCCP.setValueState(Library.ValueState.Error);
			} else {
				phoneNumberCCP.setValueState(Library.ValueState.None);
			}

			if (flag) { //Se tutti i campi inseriti sono corretti
				data = {
					"Customerid": oGlobalModel.getProperty("/quotationSelected/CustomerId"),
					"Contactpersonnr": "",
					"Contactpersonname1": firstNameCCP.getValue(),
					"Contactpersonname2": lastNameCCP.getValue(),
					"Contactpersonemail": emailCCP.getValue(),
					"Contactpersonphone": phoneNumberCCP.getValue(),
					"Contactpersonfromsap": ""
				};

				self.getView().setBusyIndicatorDelay(0);
				self.getView().setBusy(true);
				self.fragmentCreateContactPerson.setBusyIndicatorDelay(0);
				self.fragmentCreateContactPerson.setBusy(true);

				self.getOwnerComponent().getModel("oDataModel").create("/CustomerContactPersonSet", data, {
					async: false,
					success: function (result) {
						self.fragmentCreateContactPerson.setBusy(false);
						self.getView().setBusy(false);

						var txt = self.getView().getModel("i18n").getResourceBundle().getText("contactPersonAdded");
						MessageToast.show(txt, {
							duration: 1000,
							animationDuration: 1000
						});
						jQuery(".sapMMessageToast").addClass("sapMMessageToastSuccess");

						self.closeCreateContactPerson();

						self.getCustomersContactPerson();
					},
					error: function (result, b) {
						self.getView().setBusy(false);
						self.fragmentCreateContactPerson.setBusy(false);
						MessageToast.show(result.message);
					}
				});
			}
		},

		closeCreateContactPerson: function (oEvent) {
			var self = this;

			self.fragmentCreateContactPerson.close();
		},

		openEditContactPerson: function (oEvent) {
			var self = this;

			if (!self.fragmentEditContactPerson) {
				self.fragmentEditContactPerson = sap.ui.xmlfragment(self.getView().getId(),
					"zotc_easyquote.zotc_easyquote.fragment.EditContactPerson",
					self);
				self.getView().addDependent(self.fragmentEditContactPerson);
			}

			self.fragmentEditContactPerson.open();
		},

		closeEditContactPerson: function (oEvent) {
			var self = this;

			self.fragmentEditContactPerson.close();
		},

		pressRemoveContactPerson: function (oEvent) {
			var self = this;
			var viewStateModel = self.getView().getModel("viewState");
			var path = oEvent.getParameter("listItem").getBindingContextPath();

			var selContactPerson = self.getView().getModel("customCustomerContactPerson").getData()[path.substring(1)];

			viewStateModel.setProperty("/selRemoveContactPersonCustomerId", selContactPerson.Customerid);
			viewStateModel.setProperty("/selRemoveContactPersonEmail", selContactPerson.Contactpersonemail);
			viewStateModel.setProperty("/selRemoveContactPersonFirstName", selContactPerson.Contactpersonname1);
			viewStateModel.setProperty("/selRemoveContactPersonLastName", selContactPerson.Contactpersonname2);
			viewStateModel.setProperty("/selRemoveContactPersonPhone", selContactPerson.Contactpersonphone);
			viewStateModel.setProperty("/selRemoveContactPersonNr", selContactPerson.Contactpersonnr);

			if (!self.fragmentConfirmEditContactPerson) {
				self.fragmentConfirmEditContactPerson = sap.ui.xmlfragment(self.getView().getId(),
					"zotc_easyquote.zotc_easyquote.fragment.ConfirmEditContactPerson",
					self);
				self.getView().addDependent(self.fragmentConfirmEditContactPerson);
			}

			self.closeEditContactPerson();
			self.fragmentConfirmEditContactPerson.open();
		},

		closeConfirmEditContactPerson: function (oEvent) {
			var self = this;

			self.fragmentConfirmEditContactPerson.close();
		},

		removeConfirmEditContactPerson: function (oEvent) {
			var self = this;
			var viewStateModel = self.getView().getModel("viewState");
			var customerId = viewStateModel.getProperty("/selRemoveContactPersonCustomerId");
			var contactNumber = viewStateModel.getProperty("/selRemoveContactPersonNr");

			var data = "/CustomerContactPersonSet(Customerid='" + customerId + "',Contactpersonnr='" + contactNumber +
				"',Contactpersonfromsap='" + "" + "')";

			self.getView().setBusyIndicatorDelay(0);
			self.getView().setBusy(true);
			self.fragmentEditContactPerson.setBusyIndicatorDelay(0);
			self.fragmentEditContactPerson.setBusy(true);

			self.getOwnerComponent().getModel("oDataModel").remove(data, {
				success: function (d) {
					self.getView().setBusy(false);
					self.fragmentEditContactPerson.setBusy(false);

					var txt = self.getView().getModel("i18n").getResourceBundle().getText("contactPersonRemoved");
					MessageToast.show(txt, {
						duration: 1000,
						animationDuration: 1000
					});
					jQuery(".sapMMessageToast").addClass("sapMMessageToastSuccess");

					self.closeConfirmEditContactPerson();

					self.getCustomersContactPerson();

				},
				error: function (result, b) {
					self.getView().setBusy(false);
					self.fragmentEditContactPerson.setBusy(false);
					MessageToast.show(result.message);
				}
			});
		},

		closeEnterTitlePo: function (oEvent) {
			var self = this;

			self.fragmentEnterTitlePo.close();
		},

		addEnterTitlePo: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var viewStateModel = self.getView().getModel("viewState");
			var newPO = viewStateModel.getProperty("/newTitlePO");

			if (self.checkTitlePoEnterTitlePo()) {
				self.fragmentEnterTitlePo.close();

				oGlobalModel.setProperty("/quotationSelected/Title", newPO);

				self.saveNewVersion(true); //se nella popUp inserisco il PO uguale a quello precedente va bene
			}
		},

		checkTitlePoEnterTitlePo: function (oEvent) {
			var self = this;
			var viewStateModel = self.getView().getModel("viewState");

			if (!viewStateModel.getProperty("/newTitlePO").trim()) {
				self.getView().byId("TitlePoEnterTitlePo").setValueState(Library.ValueState.Error);
				return false;
			} else {
				self.getView().byId("TitlePoEnterTitlePo").setValueState(Library.ValueState.None);
				return true;
			}
		},

		/********************** END CUSTOMER DATA **********************/

		/********************** BEGIN MATERIALS **********************/

		/***BEGIN SearchMaterialArea***/
		openSMA: function (oEvent) {
			var self = this;

			if (!self.fragmentSearchMaterialArea) {
				self.fragmentSearchMaterialArea = sap.ui.xmlfragment(self.getView().getId(),
					"zotc_easyquote.zotc_easyquote.fragment.SearchMaterialArea",
					self);
				self.getView().addDependent(self.fragmentSearchMaterialArea);
			}
			self.initMaterialListArray();
			// self.getView().byId("TableSearchMaterialArea").removeSelections(true);
			self.getView().byId("TableSearchMaterialArea").removeSelectionInterval(0, 199);
			self.fragmentSearchMaterialArea.open();

		},

		initMaterialListArray: function () {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var customSearchArea = self.getView().getModel("customSearchArea");
			var arr = [],
				i = 0,
				fields = oGlobalModel.getProperty("/fieldsExcel");

			for (i = 0; i < 200; i = i + 1) {
				arr.push(jQuery.extend(true, {}, fields));
			}

			customSearchArea.setData(arr);
			customSearchArea.refresh(true);
		},

		deleteItemSMA: function (oEvent) {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var customSearchArea = self.getView().getModel("customSearchArea");
			var selectedItems = oEvent.getSource().getBindingContext("customSearchArea").getPath();
			var pattern = new RegExp("/(.*)");

			var rowSelected = pattern.exec(selectedItems);

			var fields = oGlobalModel.getProperty("/fieldsExcel");

			var idx = parseInt(rowSelected[1], 10);

			customSearchArea.getData()[idx] = jQuery.extend(true, {}, fields);

			customSearchArea.refresh(true);
		},

		onUploadSMA: function (e) {
			this.importSMA(e.getParameter("files") && e.getParameter("files")[0]);
		},

		importSMA: function (file) {
			var self = this;
			var customSearchArea = self.getView().getModel("customSearchArea");
			var excelData = {};

			if (file && window.FileReader) {
				var reader = new FileReader();
				reader.onload = function (e) {
					var data = e.target.result;
					var workbook = XLSX.read(data, {
						type: 'binary'
					});
					workbook.SheetNames.forEach(function (sheetName) {
						excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
					});

					self.initMaterialListArray();

					for (var i = 0; i < excelData.length; i++) {
						customSearchArea.getData()[i] = excelData[i];
					}

					customSearchArea.refresh(true);

				};
				reader.onerror = function (ex) {
					self.initMaterialListArray();
				};
				reader.readAsBinaryString(file);
			}
		},

		addcartSMA: function (oEvent) {
			var self = this;
			var viewStateModel = self.getView().getModel("viewState");
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var customSearchArea = self.getView().getModel("customSearchArea");
			var cart = oGlobalModel.getProperty("/cart");
			var oDataFilters = [];
			var oDataFilters_cust = [];
			var flag = false;
			var string_data = "";
			var string_data_cust = "";
			var itemNoArray = [],
				itemNoDuplicates = [];
			var obj_mat = {};
			var obj_mat_cust = {};
			var itemAlreadyExists = []; //per verificare se gli itemNo specificati nell'excel sono già presenti nel cart
			var txtAlert = self.getView().getModel("i18n").getResourceBundle().getText("SMAalert");
			var itemNaN = false;

			viewStateModel.setProperty("/materialSearch", []);
			viewStateModel.setProperty("/materialSearchCust", []);
			viewStateModel.setProperty("/countCallPricingTot", 0);
			viewStateModel.setProperty("/countCallPricing", 0);
			viewStateModel.setProperty("/materialSearchNotFound", []);
			viewStateModel.setProperty("/oDataResults", []);
			viewStateModel.setProperty("/materialFound", []);
			viewStateModel.setProperty("/plantNotAllowed", []);

			customSearchArea.getData().forEach(function (x) {
				if (x.Material || x.CustomerMaterial) { //verifico se è presente almento un materiale o custMat
					flag = true;
				}
			});

			if (!flag) {
				MessageToast.show("There are no Data", {
					duration: 1000,
					animationDuration: 1000
				});
				jQuery(".sapMMessageToast").addClass("sapMMessageToastWarning");
			} else {

				itemNoArray = customSearchArea.getData().filter(function (x) { //prendo tutti i record dell'excel in cui ItemNumber è definito
					if (x.ItemNumber) {
						return x.ItemNumber;
					}
				});

				itemNoArray = itemNoArray.map(function (item) { //costruisco un array fatto solo da ItemNumber
					return item.ItemNumber
				});

				itemNoDuplicates = itemNoArray.filter((s => v => s.has(v) || !s.add(v))(new Set)); //costruisco un array fatto solo da duplicati

				if (itemNoDuplicates.length === 0) {

					itemAlreadyExists = itemNoArray.filter(item1 => cart.some(item2 =>
						(parseInt(item2.ItemNo, 10) === parseInt(item1, 10))));

					if (itemAlreadyExists.length === 0) {

						customSearchArea.getData().forEach(function (x) {
							if (x.Material) {
								if (isNaN(x["ItemNumber"])) {
									x["ItemNumber"] = "";
								}
								viewStateModel.getProperty("/materialSearch").push(
									x
								);

								customSearchArea.refresh(true);

								if (string_data) {
									string_data = string_data + "|" + x.Material;
								} else {
									string_data = x.Material;
								}

							}
							if (!x.Material && x.CustomerMaterial) {
								viewStateModel.getProperty("/materialSearchCust").push(
									x
								);
								if (string_data_cust) {
									string_data_cust = string_data_cust + "|" + x.CustomerMaterial;
								} else {
									string_data_cust = x.CustomerMaterial;
								}

							}
						});

						obj_mat = {
							// Maktx: "",
							Kunnr: oGlobalModel.getProperty("/quotationSelected/CustomerId"),
							Custmat: "",
							StringData: string_data,
							OpenPlantsSet: [],
							MaterialsSearchSet: []
						};

						obj_mat_cust = {
							// Maktx: "",
							Kunnr: oGlobalModel.getProperty("/quotationSelected/CustomerId"),
							Custmat: "X",
							StringData: string_data_cust,
							OpenPlantsSet: [],
							MaterialsSearchSet: []
						};

						jQuery.when(
							self.getMaterialSMA(obj_mat),
							self.getMaterialSMA(obj_mat_cust)
						).done(function (par1, par2) {
							var oDataResults = viewStateModel.getProperty("/oDataResults");
							var materialFound = viewStateModel.getProperty("/materialFound");
							var plantNotFoundList = [];

							var materialNotFound = viewStateModel.getProperty("/materialSearch").filter(item1 => !oDataResults.some(
								item2 => (item2.Matnr ===
									item1
									.Material)));

							var materialCustNotFound = viewStateModel.getProperty("/materialSearchCust").filter(item1 => !oDataResults.some(
								item2 => (
									item2.MatnrCust ===
									item1
									.CustomerMaterial)));

							materialNotFound.forEach(function (x) {
								viewStateModel.getProperty("/materialSearchNotFound").push(x);
							});

							materialCustNotFound.forEach(function (x) {
								viewStateModel.getProperty("/materialSearchNotFound").push(x);
							});

							if (materialFound.length > 0) {

								materialFound.forEach(function (x, index) {
									if (x.Plant) {
										oDataResults.forEach(function (y) {
											if (x.Material === y.Matnr) {
												if (!y.OpenPlants.includes(x.Plant)) {
													plantNotFoundList.push(index);
													viewStateModel.getProperty("/plantNotAllowed").push(x);
												}
											}
										});
									}
								});

								plantNotFoundList.forEach(function (x, index) {
									materialFound.splice((x - index), 1);
								});

								viewStateModel.setProperty("/countCallPricingTot", viewStateModel.getProperty("/countCallPricingTot") - plantNotFoundList.length);

								materialFound.sort(function (a, b) {
									var itemNoA = parseInt(a.ItemNumber);
									var itemNoB = parseInt(b.ItemNumber);
									if (itemNoA < itemNoB) {
										return -1;
									} else if (itemNoA > itemNoB) {
										return 1;
									} else {
										if (itemNoA) {
											return -1;
										} else if (itemNoB) {
											return 1;
										}
									}
								});

								self.pushCartSMA(oDataResults, materialFound);

							} else {
								self.getView().setBusy(false);
								self.fragmentSearchMaterialArea.setBusy(false);
								self.showMaterialNotFoundSMA();
							}

						});

					} else {

						var txtItemNo = self.getView().getModel("i18n").getResourceBundle().getText("SMAitemNo");
						var txtItemNoAlreadyExists = self.getView().getModel("i18n").getResourceBundle().getText("SMAitemNoAlreadyExists");
						var txtAlreadyEx = "";

						itemAlreadyExists.sort();

						itemAlreadyExists.forEach(function (x) {
							txtAlreadyEx = txtAlreadyEx + "- " + txtItemNo + " " + x + " " + txtItemNoAlreadyExists + "\n";
						});

						MessageBox.alert(
							txtAlreadyEx, {
								icon: MessageBox.Icon.WARNING,
								title: txtAlert,
								type: 'Message',
								state: 'Warning',
							});
					}

				} else { //se ci sono ItemNumber duplicati

					var txtItemNoDuplicates = self.getView().getModel("i18n").getResourceBundle().getText("SMAitemNumberDuplicates");

					MessageBox.alert(
						txtItemNoDuplicates, {
							icon: MessageBox.Icon.WARNING,
							title: txtAlert,
							type: 'Message',
							state: 'Warning',
						});
				}
			}
		},

		getMaterialSMA: function (obj) {
			var self = this,
				viewStateModel = self.getView().getModel("viewState"),
				oModel = self.getOwnerComponent().getModel("oDataModel");
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var cart = oGlobalModel.getProperty("/cart"),
				headerPrice = oGlobalModel.getProperty("/quotationSelected/NetValue"),
				length = 0;
			var materialNotFound = [];
			var materialFound = [];
			var def = jQuery.Deferred();

			self.getView().setBusyIndicatorDelay(0);
			self.getView().setBusy(true);

			self.fragmentSearchMaterialArea.setBusyIndicatorDelay(0);
			self.fragmentSearchMaterialArea.setBusy(true);

			oModel.create("/MaterialsSearchHeaderSet", obj, {
				success: function (oData, oResponse) {
					if (oData.MaterialsSearchSet) {

						oData.MaterialsSearchSet.results.forEach(function (x) {
							x.OpenPlants = [];
							oData.OpenPlantsSet.results.forEach(function (y) {
								if (x.Matnr === y.Matnr) {
									x.OpenPlants.push(y.Werks);
								}
							});
						});

						if (!oData.Custmat) { //se è get_materials
							materialFound = viewStateModel.getProperty("/materialSearch").filter(item1 => oData.MaterialsSearchSet.results.some(
								item2 =>
								(item2.Matnr ===
									item1
									.Material)));

						} else { //se è get_customer_materials
							materialFound = viewStateModel.getProperty("/materialSearchCust").filter(item1 => oData.MaterialsSearchSet.results.some(
								item2 => (item2.MatnrCust ===
									item1
									.CustomerMaterial)));

							materialFound.forEach(function (x) { //recupero il Matnr
								oData.MaterialsSearchSet.results.forEach(function (y) {
									if (x.CustomerMaterial === y.MatnrCust) {
										x.Material = y.Matnr;
									}
								})
							});
						}

						if (materialFound.length > 0) {
							materialFound.forEach(function (x) {
								viewStateModel.getProperty("/materialFound").push(x);
							});
						}
					}
					if (oData.MaterialsSearchSet && oData.MaterialsSearchSet.results.length) {
						viewStateModel.setProperty("/countCallPricingTot", viewStateModel.getProperty("/countCallPricingTot") + materialFound.length);

						oData.MaterialsSearchSet.results.forEach(function (x) {
							viewStateModel.getProperty("/oDataResults").push(x);
						});

					} else {

					}
					def.resolve(oData.result);

				},
				error: function () {
					self.getView().setBusy(false);
					self.fragmentSearchMaterialArea.setBusy(false);
					var msg = "";
					var objerror = jQuery.parseJSON(err.responseText); //.error.message.value
					if (objerror && objerror.error && objerror.error.message && objerror.error.message.value) {
						msg = objerror.error.message.value;
					}
					if (msg !== "") {
						MessageBox.show(msg, MessageBox.Icon.ERROR);
					}
					def.reject();
				}
			});
			return def;
		},

		pushCartSMA: function (items, materialFound) {
			var self = this,
				viewStateModel = self.getView().getModel("viewState"),
				oModel = self.getOwnerComponent().getModel("oDataModel");
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var cart = oGlobalModel.getProperty("/cart"),
				headerPrice = oGlobalModel.getProperty("/quotationSelected/NetValue"),
				length = 0;
			var countCallPricing = 0;
			var itemsPricing = [];
			var customItemNo = "";
			var maxItemNo = 0;

			materialFound.forEach(function (x) {
				items.forEach(function (item, index) {

					if (x.Material === item.Matnr) {

						item.Length = parseFloat(item.Length);
						if (item.Factor && parseFloat(item.Factor) > 0) {
							item.Factor = parseFloat(item.Factor);
						} else {
							item.Factor = (item.is_not_cable === "X" ? 0 : 1);
						}
						self.calculateHeaderPrice();
						headerPrice = (parseInt(headerPrice, 10) + item.Netwr).toString();

						maxItemNo = self.getMaxItemNoBC();

						length = (cart.length + 1) * 10;
						if (x.ItemNumber) {
							customItemNo = ("000000" + x.ItemNumber).slice(-6);
						} else {
							if (maxItemNo > length) {
								customItemNo = ("000000" + (parseInt(maxItemNo) + 10)).slice(-6);
							} else {
								customItemNo = ("000000" + length).slice(-6);
							}
						}

						var itemDetails = {
							Factor: x.Factor ? x.Factor : item.Factor,
							Kunnr: item.Kunnr,
							IndividualLength: x.Length ? x.Length : item.Length,
							Matnr: item.Matnr,
							Werks: x.Plant ? x.Plant : item.Werks,
							Vrkme: x.MeasureUnit ? x.MeasureUnit : item.Meins,
							Maktx: item.Maktx,
							ItemNo: customItemNo,
							ContributionMargin: {
								CmPercentage: x.Cm ? x.Cm : undefined,
								CmKschl: x.PriceCondition ? x.PriceCondition : undefined,
								CmKmein: x.MeasureUnit ? x.MeasureUnit : undefined,
								CmKpein: x.ConditionLength ? x.ConditionLength : undefined,
								CmKwert: x.ConditionValue ? x.ConditionLength : undefined
							}
						};

						itemsPricing.push(itemDetails);

						oGlobalModel.getProperty("/cart").push(itemDetails)

						jQuery.when(
							self.getPricingCMSMA(itemDetails),
							itemsPricing.pop()

						).done(function (par1, par2) {
							countCallPricing++;
							viewStateModel.setProperty("/countCallPricing", viewStateModel.getProperty("/countCallPricing") + 1);

							if (viewStateModel.getProperty("/countCallPricing") === viewStateModel.getProperty("/countCallPricingTot")) {

								self.fragmentSearchMaterialArea.setBusy(false);
								self.getView().setBusy(false);

								self.fragmentSearchMaterialArea.close();

								var txt = self.getView().getModel("i18n").getResourceBundle().getText("SMAitemsAdded");
								MessageToast.show(txt, {
									duration: 1000,
									animationDuration: 1000
								});
								jQuery(".sapMMessageToast").addClass("sapMMessageToastSuccess");

								self.showMaterialNotFoundSMA();
							}

						}).fail(function (error) {
							self.fragmentSearchMaterialArea.setBusy(false);
							self.getView().setBusy(false);
						});
					}
				});
				if (!cart) {
					cart = [];
				}

				oGlobalModel.setProperty("/headerInfo/headerInfoQuotationCart", cart.length);
				oGlobalModel.refresh();
			});
		},

		getPricingCMSMA: function (itemDetails) {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel"),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				header = oGlobalModel.getProperty("/quotationSelected"),
				pricing = [],
				selMat = itemDetails,
				manualConditionsOrig = oGlobalModel.getProperty("/manualConditionsOrig"),
				pricingManual = [],
				contributionMargin = oGlobalModel.getProperty("/contributionMargin"),
				conditionsToSubtract = {
					YAD6: true,
					YAD7: true,
					YAS1: true,
					YAS2: true
				},
				first = {};
			var def = jQuery.Deferred();

			self.getView().setBusy(true);
			self.fragmentSearchMaterialArea.setBusy(true);

			if (pricing) {
				pricingManual = pricing.filter(function (value, index, arr) {
					return value.Manual === true;
				});
			}

			if (!manualConditionsOrig) {
				manualConditionsOrig = [];
			}

			var obj = {
				QuotationNo: header.QuotationNo,
				Version: header.Version,
				Kunnr: header.CustomerId,
				CmPercentage: itemDetails.ContributionMargin.CmPercentage,
				CmKschl: itemDetails.ContributionMargin.CmKschl,
				CmKmein: itemDetails.ContributionMargin.CmKmein,
				CmKpein: itemDetails.ContributionMargin.CmKpein,
				MaterialPricingItemsSet: [],
				QuotationItemSet: []
			};

			obj.QuotationItemSet.push({
				QuotationNo: header.QuotationNo,
				Version: header.Version,
				ItemNo: selMat.ItemNo,
				Matnr: selMat.Matnr,
				Werks: selMat.Werks,
				Factor: selMat.Factor.toString(),
				IndividualLength: selMat.IndividualLength.toString(),
				Vrkme: selMat.Vrkme
			});

			pricingManual.forEach(function (x) {
				obj.MaterialPricingItemsSet.push({
					QuotationNo: header.QuotationNo,
					ItemNo: selMat.ItemNo,
					Version: header.Version,
					Kschl: itemDetails.ContributionMargin.CmKschl,
					Text: x.Vtext,
					Kwert: itemsDetails.ContributionMargi.CmKwert ? itemsDetails.ContributionMargi.CmKwert : x.Kwert,
					Kpein: itemDetails.ContributionMargin.CmKpein,
					Kmein: itemDetails.ContributionMargin.CmKmein,
					Waers: x.Currency
				});
			});

			oModel.create("/MaterialPricingHeadSet", obj, {
				async: true,
				success: function (result) {
					self.getView().setBusy(true);
					self.fragmentSearchMaterialArea.setBusy(true);

					if (result.MaterialPricingItemsSet) {
						first = result.MaterialPricingItemsSet.results[0];
						selMat.Pricing = [];
						if (result.MaterialPricingItemsSet.results.length) {
							result.MaterialPricingItemsSet.results.forEach(function (x) {
								if (conditionsToSubtract[x.Kschl] === true) {
									first.NetValue = parseFloat(first.NetValue) - parseFloat(x.Kbetr);
								}
								x.Kwert = Math.round(parseFloat(x.Kwert) * 100) / 100;
								x.Kbetr = Math.round(parseFloat(x.Kbetr) * 100) / 100;
								var isManualCond = manualConditionsOrig.find(function (manualCond, index) {
									return manualCond.Kschl === x.Kschl;
								});
								if (isManualCond) {
									x.Manual = true;
								} else {
									x.Manual = false;
								}
								selMat.Pricing.push(x);
							});
						}

						first.NetValue = Math.round(parseFloat(first.NetValue) * 100) / 100;

						selMat.Netwr = first.NetValue;
						selMat.Waerk = first.Currency;
						selMat.Vrkme = first.Meins;

						self.calculateHeaderPrice();
					} else {
						selMat.Netwr = 0;
					}

					def.resolve();
				},
				error: function (result, b) {
					MessageToast.show(result.message);
					def.reject();
				}
			});

			return def;
		},

		showMaterialNotFoundSMA: function (oEvent) {
			var self = this;
			var viewStateModel = self.getView().getModel("viewState");
			var txtNotFound = [];
			var matNotFoundTxt = self.getView().getModel("i18n").getResourceBundle().getText("SMAnotFound");
			var plantNotAllowed = self.getView().getModel("i18n").getResourceBundle().getText("SMAplantNotAllowed");
			var warningTxt = self.getView().getModel("i18n").getResourceBundle().getText("SMAwarning");

			if (viewStateModel.getProperty("/materialSearchNotFound").length > 0) {
				viewStateModel.getProperty("/materialSearchNotFound").forEach(function (x, index) {
					if (x.Material || x.CustomerMaterial) {
						x.Material ? (txtNotFound = txtNotFound + "- " + x.Material + " " + matNotFoundTxt + "\n") : (txtNotFound = txtNotFound +
							"- " +
							x.CustomerMaterial + " " + matNotFoundTxt + "\n");
					}
				});
			}

			if (txtNotFound.length) {
				txtNotFound = txtNotFound + "\n";
			}

			if (viewStateModel.getProperty("/plantNotAllowed").length > 0) {
				viewStateModel.getProperty("/plantNotAllowed").forEach(function (x, index) {
					txtNotFound = txtNotFound + "- " + x.Plant + ": " + x.Material + ": " + plantNotAllowed + "\n";
				});
			}

			if (txtNotFound.length) {
				MessageBox.alert(
					txtNotFound, {
						icon: MessageBox.Icon.WARNING,
						title: warningTxt,
						type: 'Message',
						state: 'Warning',
					});
			}
		},

		downloadTemplate: function (oEvent) {
			var self = this;
			var a = document.createElement("a");
			a.href = "../resources/Template_EasyQuote.xlsx";
			var fileName = decodeURIComponent("Template EasyQuote");
			a.download = fileName;
			document.body.appendChild(a);
			a.click();
			a.remove();
		},

		onPasteExcel: function (oEvent) {
			var self = this;
		},

		closeSMA: function (oEvent) {
			var self = this;

			self.fragmentSearchMaterialArea.close();
		},

		/***END SearchMaterialArea***/

		onMaterialSelection: function (oEvent) {
			var self = this,
				matSearch = oEvent.getParameter("listItem").getBindingContext("viewState").getObject(),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			var itemDetails = {
				Factor: matSearch.Factor,
				Kunnr: matSearch.Kunnr,
				IndividualLength: matSearch.Length,
				Matnr: matSearch.Matnr,
				Werks: matSearch.Werks,
				Vrkme: matSearch.Meins,
				Maktx: matSearch.Maktx,
				ItemNo: ""
			};

			oGlobalModel.setProperty("/selectedMaterial", itemDetails);
			oGlobalModel.setProperty("/expertMode", false);
			oGlobalModel.setProperty("/addToCart", true);
			self.getRouter().navTo("ItemDetails");
		},

		handleMaterialSearch: function (oEvent) {
			var self = this,
				oDataFilters = [],
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				oViewModel = self.getView().getModel("viewState");

			/*	oDataFilters.push(new sap.ui.model.Filter("Maktx", sap.ui.model.FilterOperator.EQ, oEvent.getParameter("query")));
				oDataFilters.push(new sap.ui.model.Filter("Kunnr", sap.ui.model.FilterOperator.EQ, oGlobalModel.getProperty(
					"/quotationSelected/CustomerId")));
				oDataFilters.push(new sap.ui.model.Filter("Custmat", sap.ui.model.FilterOperator.EQ, ""));*/

			var obj = {
				Maktx: oEvent.getParameter("query"),
				Kunnr: oGlobalModel.getProperty("/quotationSelected/CustomerId"),
				Custmat: "",
				OpenPlantsSet: [],
				MaterialsSearchSet: []
			};

			oViewModel.setProperty("/customerMaterialSearchString", "");

			self.getMaterials(obj);
		},

		handleCustomerMaterialSearch: function (oEvent) {
			var self = this,
				oDataFilters = [],
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				oViewModel = self.getView().getModel("viewState");

			/*oDataFilters.push(new sap.ui.model.Filter("Maktx", sap.ui.model.FilterOperator.EQ, oEvent.getParameter("query")));
			oDataFilters.push(new sap.ui.model.Filter("Kunnr", sap.ui.model.FilterOperator.EQ, oGlobalModel.getProperty(
				"/quotationSelected/CustomerId")));
			oDataFilters.push(new sap.ui.model.Filter("Custmat", sap.ui.model.FilterOperator.EQ, "X"));*/

			var obj = {
				Maktx: oEvent.getParameter("query"),
				Kunnr: oGlobalModel.getProperty("/quotationSelected/CustomerId"),
				Custmat: "X",
				OpenPlantsSet: [],
				MaterialsSearchSet: []
			};

			oViewModel.setProperty("/materialSearchString", "");

			self.getMaterials(obj);
		},

		getMaterials: function (obj) {
			var self = this,
				oViewModel = self.getView().getModel("viewState"),
				oModel = self.getOwnerComponent().getModel("oDataModel");

			self.getView().setBusy(true);

			oModel.create("/MaterialsSearchHeaderSet", obj, {
				success: function (oData, oResponse) {
					self.getView().setBusy(false);

					if (oData.MaterialsSearchSet) {

						oData.MaterialsSearchSet.results.forEach(function (item) {
							item.Length = parseFloat(item.Length);
							if (item.Factor && parseFloat(item.Factor) > 0) {
								item.Factor = parseFloat(item.Factor);
							} else {
								item.Factor = (item.is_not_cable === "X" ? 0 : 1);
							}
						});
						oViewModel.setProperty("/listMaterials", oData.MaterialsSearchSet.results);
					} else {
						oViewModel.setProperty("/listMaterials", []);
					}

				},
				error: function () {
					self.getView().setBusy(false);
					oViewModel.setProperty("/listMaterials", []);
					var msg = "";
					var objerror = jQuery.parseJSON(err.responseText); //.error.message.value
					if (objerror && objerror.error && objerror.error.message && objerror.error.message.value) {
						msg = objerror.error.message.value;
					}
					if (msg !== "") {
						MessageBox.show(msg, MessageBox.Icon.ERROR);
					}
				}
			});

			/*	oModel.read("/MaterialsSearchSet", {
					filters: oDataFilters,
					async: false,
					success: function (oData, result) {
						self.getView().setBusy(false);
						oData.results.forEach(function (item) {
							item.Length = parseFloat(item.Length);
							if (item.Factor && parseFloat(item.Factor) > 0) {
								item.Factor = parseFloat(item.Factor);
							} else {
								item.Factor = (item.is_not_cable === "X" ? 0 : 1);
							}
						});
						oViewModel.setProperty("/listMaterials", oData.results);
					},
					error: jQuery.proxy(function (err) {
						self.getView().setBusy(false);
						oViewModel.setProperty("/listMaterials", []);
						var msg = "";
						var objerror = jQuery.parseJSON(err.responseText); //.error.message.value
						if (objerror && objerror.error && objerror.error.message && objerror.error.message.value) {
							msg = objerror.error.message.value;
						}
						if (msg !== "") {
							MessageBox.show(msg, MessageBox.Icon.ERROR);
						}
					}, this)
				});*/
		},

		getItemChars: function () {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel"),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				header = oGlobalModel.getProperty("/quotationSelected"),
				cart = oGlobalModel.getProperty("/cart"),
				oDataFilters = [];

			oDataFilters.push(new sap.ui.model.Filter("QuotationNo", sap.ui.model.FilterOperator.EQ, header.QuotationNo));
			oDataFilters.push(new sap.ui.model.Filter("Version", sap.ui.model.FilterOperator.EQ, header.Version));

			oModel.read("/MaterialCharsSet", {
				filters: oDataFilters,
				async: false,
				success: function (oData, result) {
					cart.forEach(function (x) {
						cart.Chars = oData.results.filter(function (y) {
							return x.ItemNo === y.ItemNo;
						});
					});
					oGlobalModel.setProperty("/cart", cart);
				},
				error: function (result, b) {
					oGlobalModel.setProperty("/cart", cart);
				}
			});
		},

		//Cart
		onGoToCart: function () {
			var self = this;
			self.getRouter().navTo("Cart");
		},

		//End Cart

		/********************** END MATERIALS **********************/

	});
});