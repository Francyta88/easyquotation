sap.ui.define([
	"./BaseController",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	"zotc_easyquote/zotc_easyquote/formatter/Formatter",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function (BaseController, History, JSONModel, Formatter, MessageBox, MessageToast) {
	"use strict";

	return BaseController.extend("zotc_easyquote.zotc_easyquote.controller.Cart", {
		formatter: Formatter,

		getDefaultViewStateValues: function () {
			return {
				availabilityExpanded: false,
				priceExpanded: false
			};
		},
		onInit: function () {
			var self = this;
			this.getRouter().attachRoutePatternMatched(self._onLoadGloabalData, this);
		},
		_onLoadGloabalData: function (oEvent) {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel");
			//oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
			//oDataFilters = [];

			if (oEvent.getParameters() !== null) {
				var oParameters = oEvent.getParameters();
				if (oParameters.name !== "Cart") {
					return;
				}
			}
			if (oModel !== undefined) {

				//Put here loading logic

			} else {
				self.getOwnerComponent().getRouter().navTo("Home");
			}
		},
		onNavBack: function () {
			var self = this;
			//var oHistory = History.getInstance();
			//var sPreviousHash = oHistory.getPreviousHash();

			self.getRouter().navTo("QuotationsDetails");
		},
		onDeleteSingleItem: function (oEvent) {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				item = oEvent.getSource().getBindingContext("globalModel").getObject(),
				cart = oGlobalModel.getProperty("/cart"),
				deleteMsg = self.getView().getModel("i18n").getResourceBundle().getText("CARTdeleteMsg").replace("&", item.ItemNo),
				deleteTitle = self.getView().getModel("i18n").getResourceBundle().getText("CARTdeleteTitle");

			MessageBox.information(deleteMsg, {
				title: deleteTitle,
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				emphasizedAction: MessageBox.Action.YES,
				initialFocus: MessageBox.Action.YES,
				onClose: function (sAction) {
					switch (sAction) {
					case MessageBox.Action.YES:
						cart = cart.filter(function (value, index, arr) {
							if (value.ItemNo !== item.ItemNo) {
								return true;
							}
						});

						oGlobalModel.setProperty("/cart", cart);
						self.calculateHeaderPrice("delete");
						break;
					case MessageBox.Action.NO:
						break;
					}
				}
			});
		},
		onDeleteItems: function (oEvent) {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				selectedItems = oEvent.getSource().getParent().getParent().getSelectedContexts(),
				cart = oGlobalModel.getProperty("/cart"),
				deleteMsg = self.getView().getModel("i18n").getResourceBundle().getText("CARTdeleteMsg"),
				deleteTitle = self.getView().getModel("i18n").getResourceBundle().getText("CARTdeleteTitle");

			if (selectedItems.length === 0) {
				var txt = self.getView().getModel("i18n").getResourceBundle().getText("CARTnoItemsSelected");
				MessageToast.show(txt, {
					duration: 1000,
					animationDuration: 1000
				});
				jQuery(".sapMMessageToast").addClass("sapMMessageToastError");
				return;
			}

			MessageBox.information(deleteMsg, {
				title: deleteTitle,
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				emphasizedAction: MessageBox.Action.YES,
				initialFocus: MessageBox.Action.YES,
				onClose: function (sAction) {
					switch (sAction) {
					case MessageBox.Action.YES:
						selectedItems.reverse();
						selectedItems.forEach(function (x) {
							var path = x.getPath();
							var idx = parseInt(path.substring(path.lastIndexOf('/') + 1), 10);
							cart.splice(idx, 1);
						});

						oGlobalModel.setProperty("/cart", cart);
						self.calculateHeaderPrice("delete");
						break;
					case MessageBox.Action.NO:
						break;
					}
				}
			});

		},
		onCartItemPress: function (oEvent) {
			var self = this,
				item = oEvent.getParameter("listItem").getBindingContext("globalModel").getObject(),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			oGlobalModel.setProperty("/selectedMaterial", item);
			oGlobalModel.setProperty("/expertMode", false);
			oGlobalModel.setProperty("/addToCart", false);
			self.getRouter().navTo("ItemDetails");
		},
		onContributionMargin: function (oEvent) {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				selectedItems = oEvent.getSource().getParent().getParent().getSelectedContexts(),
				selObjects = [];

			if (selectedItems.length === 0) {
				var txt = self.getView().getModel("i18n").getResourceBundle().getText("CARTnoItemsSelected");
				MessageToast.show(txt, {
					duration: 1000,
					animationDuration: 1000
				});
				jQuery(".sapMMessageToast").addClass("sapMMessageToastError");
				return;
			}
			oGlobalModel.setProperty("/contributionMargin/selectedItems", selectedItems.length);

			selectedItems.forEach(function (x) {
				selObjects.push(oGlobalModel.getProperty(x.getPath()));
			});

			oGlobalModel.setProperty("/selectedCartItems", selObjects);

			if (!self.fragmentContributionMargin) {
				self.fragmentContributionMargin = sap.ui.xmlfragment(self.getView().getId(),
					"zotc_easyquote.zotc_easyquote.fragment.ContributionMargin",
					self);
				self.getView().addDependent(self.fragmentContributionMargin);
			}

			self.fragmentContributionMargin.open();
		},
		onListSelect: function (oEvent) {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				selectedItem = oGlobalModel.getProperty(oEvent.getParameter('selectedItem').getBindingContext("globalModel").getPath());
			oGlobalModel.setProperty("/contributionMargin/SelectedCondType", selectedItem.Kschl);
		},
		onCalculateCM: function () {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel"),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				selectedItems = oGlobalModel.getProperty("/selectedCartItems"),
				contributionMargin = oGlobalModel.getProperty("/contributionMargin"),
				header = oGlobalModel.getProperty("/quotationSelected"),
				manualConditionsOrig = oGlobalModel.getProperty("/manualConditionsOrig"),
				pricingManual = [],
				conditionsToSubtract = {
					YAD6: true,
					YAD7: true,
					YAS1: true,
					YAS2: true
				},
				first = {};

			self.fragmentContributionMargin.close();

			self.getView().setBusy(true);

			var obj = {
				QuotationNo: header.QuotationNo,
				Version: header.Version,
				Kunnr: header.CustomerId,
				CmPercentage: contributionMargin.Percentage,
				CmKschl: contributionMargin.SelectedCondType,
				CmKmein: contributionMargin.Kmein,
				CmKpein: contributionMargin.Kpein,
				MaterialPricingItemsSet: [],
				QuotationItemSet: []
			};

			selectedItems.forEach(function (x) {

				obj.QuotationItemSet.push({
					QuotationNo: header.QuotationNo,
					Version: header.Version,
					ItemNo: x.ItemNo,
					Matnr: x.Matnr,
					Werks: x.Werks,
					Factor: x.Factor.toString(),
					IndividualLength: x.IndividualLength.toString(),
					Vrkme: x.Vrkme
				});

				if (x.Pricing) {
					pricingManual = x.Pricing.filter(function (value, index, arr) {
						return value.Manual === true;
					});
				}

				if (!manualConditionsOrig) {
					manualConditionsOrig = [];
				}

				pricingManual.forEach(function (y) {
					obj.MaterialPricingItemsSet.push({
						QuotationNo: header.QuotationNo,
						ItemNo: x.ItemNo,
						Version: header.Version,
						Kschl: y.Kschl,
						Text: y.Vtext,
						Kwert: y.Kwert,
						Kpein: y.Kpein,
						Kmein: y.Meins,
						Waers: y.Currency
					});
				});
			});

			oModel.create("/MaterialPricingHeadSet", obj, {
				async: true,
				success: function (result) {
					self.getView().setBusy(false);

					selectedItems.forEach(function (selMat) {

						var selMatPricing = result.MaterialPricingItemsSet.results.filter(function (value, index, arr) {
							return value.ItemNo === selMat.ItemNo;
						});

						if (selMatPricing.length) {

							first = selMatPricing[0];
							selMat.Pricing = [];

							selMatPricing.forEach(function (x) {
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

							first.NetValue = Math.round(parseFloat(first.NetValue) * 100) / 100;

							selMat.Netwr = first.NetValue;
							selMat.Waerk = first.Currency;
							selMat.Vrkme = first.Meins;

						}

					});

					oGlobalModel.setProperty("/selectedCartItems", selectedItems);
					self.calculateHeaderPrice();

				},
				error: function (result, b) {
					self.getView().setBusy(false);
					//self.fragmentCreateContactPerson.setBusy(false);
					//MessageToast.show(result.message);
				}
			});

		},
		oncloseCM: function () {
			var self = this;
			self.fragmentContributionMargin.close();
		},

		onSaveQuote: function () {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var typeSaveStage = "";
			var flagRequiredFields;

			flagRequiredFields = self.checkRequiredFieldsBC();

			if (flagRequiredFields) {
				if (oGlobalModel.getProperty("/createMode")) {
					typeSaveStage = "C";
				} else {
					typeSaveStage = "E";
				}

				jQuery.when(
					self.onSaveQuoteBC(typeSaveStage, "noMex")
				).done(function (par1, par2) {
					self.sendQuoteToSap();
				}).fail(function (error) {

				});

			} else {
				self.showRequiredFields();
			}
		},

		sendQuoteToSap: function () {
			var self = this;
			var oModel = self.getOwnerComponent().getModel("oDataModel");
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var obj = {
				QuotationNo: oGlobalModel.getProperty("/quotationSelected/QuotationNo"),
				Version: oGlobalModel.getProperty("/quotationSelected/Version"),
				Status: "SentToSap",
				BapiRet2Set: []
			};
			var errorBapiTxt = "";

			self.getView().setBusyIndicatorDelay(0);
			self.getView().setBusy(true);

			oModel.create("/QuotationStatusSet", obj, {
				success: function (oData, oResponse) {

					if (oData.SapQuotationNo) {
						oGlobalModel.setProperty("/updateTable", true);

						oGlobalModel.setProperty("/headerInfo/headerInfoQuotationSAP", oData.SapQuotationNo);
						oGlobalModel.setProperty("/quotationSelected/SapQuotationNo", oData.SapQuotationNo);
						oGlobalModel.setProperty("/quotationSelected/Status", oData.Status);

						oGlobalModel.refresh(true);
						self.getView().setBusy(false);

						var txtWarning = self.getView().getModel("i18n").getResourceBundle().getText("CARTwarning");
						var sapQuotationTxt = self.getView().getModel("i18n").getResourceBundle().getText("CARTsapQuotation");
						var createdTxt = self.getView().getModel("i18n").getResourceBundle().getText("CARTcreated");
						var txt = sapQuotationTxt + " " + oData.SapQuotationNo + " " + createdTxt;
						MessageToast.show(txt, {
							duration: 2000,
							animationDuration: 2000
						});
						jQuery(".sapMMessageToast").addClass("sapMMessageToastSuccess");
					} else {
						if (oData.BapiRet2Set && oData.BapiRet2Set.results && oData.BapiRet2Set.results.length) {
							oData.BapiRet2Set.results.forEach(function (x) {
								errorBapiTxt = errorBapiTxt + x.Message + "\n";
							});

							if (errorBapiTxt) {
								MessageBox.alert(
									errorBapiTxt, {
										icon: MessageBox.Icon.WARNING,
										title: txtWarning,
										type: 'Message',
										state: 'Warning',
									});
							}

						}
						self.getView().setBusy(false);
					}
				},
				error: function () {
					self.getView().setBusy(false);
				}
			});

		},

		showRequiredFields: function () {
			var self = this;
			var finalTxt = [];
			var projectNameMissing = self.getView().getModel("i18n").getResourceBundle().getText("CARTprojectNameMissing");
			var poMissing = self.getView().getModel("i18n").getResourceBundle().getText("CARTpoMissing");
			var quotationDateMissing = self.getView().getModel("i18n").getResourceBundle().getText("CARTquotationDateMissing");
			var quotationValidMissing = self.getView().getModel("i18n").getResourceBundle().getText("CARTquotationValidMissing");
			var customerMissing = self.getView().getModel("i18n").getResourceBundle().getText("CARTcustomerMissing");
			var requiredFields = self.getView().getModel("i18n").getResourceBundle().getText("CARTrequiredFields");

			if (!self.checkProjectNameBC()) {
				finalTxt = finalTxt + "- " + projectNameMissing + "\n\n";
			}
			if (!self.checkTitlePoBC()) {
				finalTxt = finalTxt + "- " + poMissing + "\n\n";
			}
			if (!self.checkQuotationDateBC()) {
				finalTxt = finalTxt + "- " + quotationDateMissing + "\n\n";
			}
			if (!self.checkQuotationValidBC()) {
				finalTxt = finalTxt + "- " + quotationValidMissing + "\n\n";
			}
			if (!self.checkCustomerIdBC()) {
				finalTxt = finalTxt + "- " + customerMissing + "\n\n    ";
			}

			if (finalTxt.length) {
				MessageBox.alert(
					finalTxt, {
						icon: MessageBox.Icon.WARNING,
						title: requiredFields,
						type: 'Message',
						state: 'Warning',
					});
			}

		}
	});
});