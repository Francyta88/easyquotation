sap.ui.define([
	"./BaseController",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	"zotc_easyquote/zotc_easyquote/formatter/Formatter",
	"sap/m/MessageBox"
], function (BaseController, History, JSONModel, Formatter, MessageBox) {
	"use strict";

	return BaseController.extend("zotc_easyquote.zotc_easyquote.controller.ItemDetails", {
		formatter: Formatter,

		getDefaultViewStateValues: function () {
			return {
				availabilityExpanded: false,
				priceExpanded: false
			};
		},
		onInit: function () {
			var self = this;
			self.getView().setModel(new JSONModel({
				oldNetwr: ""
			}), "viewState");
			this.getRouter().attachRoutePatternMatched(self._onLoadGloabalData, this);
		},
		_onLoadGloabalData: function (oEvent) {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel"),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				selMat = oGlobalModel.getProperty("/selectedMaterial"),
				maxItemNo = 0;

			if (!selMat.ItemNo) {
				maxItemNo = self.getMaxItemNoBC();
				selMat.ItemNo = ("000000" + (parseInt(maxItemNo, 10) + 10)).slice(-6);
			}

			if (oEvent.getParameters() !== null) {
				var oParameters = oEvent.getParameters();
				if (oParameters.name !== "ItemDetails") {
					return;
				}
			}
			if (oModel !== undefined) {

				if (!selMat.ContentTexts) {
					selMat.ContentTexts = [];
				}
				oGlobalModel.refresh(true);
				self.getAvailability();
			} else {
				self.getOwnerComponent().getRouter().navTo("Home");
			}
		},
		getAvailability: function () {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel"),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				selMat = oGlobalModel.getProperty("/selectedMaterial"),
				oDataFilters = [];

			oDataFilters.push(new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.EQ, selMat.Matnr));
			oDataFilters.push(new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.EQ, selMat.Werks));
			self.getView().setBusy(true);

			oModel.read("/MaterialAvailabilitySet", {
				filters: oDataFilters,
				async: true,
				success: function (oData, result) {
					//self.getView().setBusy(false);

					var openInOwnPlant = false,
						stockMRAccumulator,
						j,
						k,
						freeStock,
						itemStock = [];

					if (oData.results.length > 0) {

						stockMRAccumulator = oData.results
							.map(function (node) {
								var itm = {};
								itm[node.StockCategory + "_" + node.Length + "_" + node.Location + "_" + node.Atpcat] = node;
								return itm;
							})
							.reduce(function (accumulator, currentValue) {
								var tmp, key,
									date1, date2;
								for (tmp in currentValue) {
									if (currentValue.hasOwnProperty(tmp)) {
										key = tmp;
										break;
									}
								}
								if (key) {
									if (!accumulator[key]) {
										accumulator[key] = currentValue[key];
										if (accumulator[key].OtherReceipt > 0) {
											accumulator[key].FirstRecQty = accumulator[key].OtherReceipt;
										}
									} else {
										accumulator[key].Factor = parseFloat(accumulator[key].Factor) + parseFloat(currentValue[key].Factor);
										accumulator[key].TotalStock = parseFloat(accumulator[key].TotalStock) + parseFloat(currentValue[key].TotalStock);
										accumulator[key].FreeStock = parseFloat(accumulator[key].FreeStock) + parseFloat(currentValue[key].FreeStock);
										accumulator[key].PeggStock = parseFloat(accumulator[key].PeggStock) + parseFloat(currentValue[key].PeggStock);
										accumulator[key].Transit = parseFloat(accumulator[key].Transit) + parseFloat(currentValue[key].Transit);
										accumulator[key].Inspect = parseFloat(accumulator[key].Inspect) + parseFloat(currentValue[key].Inspect);
										accumulator[key].Blocked = parseFloat(accumulator[key].Blocked) + parseFloat(currentValue[key].Blocked);
										accumulator[key].OtherStock = parseFloat(accumulator[key].OtherStock) + parseFloat(currentValue[key].OtherStock);
										accumulator[key].FirstRecQty = parseFloat(accumulator[key].OtherReceipt);
										accumulator[key].OtherReceipt = parseFloat(accumulator[key].OtherReceipt) + parseFloat(currentValue[key].OtherReceipt);
										if (accumulator[key].OtherReceipt > 0) {
											date1 = Formatter.convertDate({
												date: accumulator[key].OtherReceiptDate,
												outputDate: true
											});
											date2 = Formatter.convertDate({
												date: currentValue[key].OtherReceiptDate,
												outputDate: true
											});
											if (date1 > date2) {
												accumulator[key].OtherReceiptDate = currentValue[key].OtherReceiptDate;
												accumulator[key].FirstRecQty = currentValue[key].OtherReceipt;
											}
										}
									}
								}

								return accumulator;
							});
						for (k in stockMRAccumulator) {
							if (stockMRAccumulator.hasOwnProperty(k)) {
								itemStock.push(stockMRAccumulator[k]);
							}
						}

						freeStock = itemStock
							.map(function (node) {
								return node.TotalStock - node.PeggStock;
							})
							.reduce(function (accumulator, current) {
								return accumulator + current;
							}, 0);
						selMat.LoadingAvailability = false;
						selMat.Stock = itemStock;
						selMat.Stock.sort(function (a, b) {
							var sortResult = parseFloat(a.length) - parseFloat(b.length);
							return sortResult;
						});
						if (freeStock) {
							for (j = 0; j < selMat.stock; j = j + 1) {
								/*if (settings.werks === selMat.stock[j].location) {
									openInOwnPlant = true;
									break;
								}*/
							}
							selMat.FreeStock = freeStock;
							if (openInOwnPlant) {
								selMat.Availability = "A";

							} else {
								selMat.Availability = "O";
							}

						} else {
							selMat.FreeStock = 0;
							selMat.Availability = "N";
						}

					} else {
						selMat.FreeStock = 0;
						selMat.Availability = "N";
					}

					oGlobalModel.setProperty("/selectedMaterial", selMat);

					self.onGetPricing();
					self.getItemMetals();
					self.getItemExtendedTexts();
					self.getItemChars();
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
		onNavBack: function () {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("Home", true);
			}
		},
		onGetPricing: function () {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel"),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				header = oGlobalModel.getProperty("/quotationSelected"),
				pricing = oGlobalModel.getProperty("/selectedMaterial/Pricing"),
				selMat = oGlobalModel.getProperty("/selectedMaterial"),
				manualConditionsOrig = oGlobalModel.getProperty("/manualConditionsOrig"),
				pricingManual = [],
				conditionsToSubtract = {
					YAD6: true,
					YAD7: true,
					YAS1: true,
					YAS2: true
				},
				first = {};

			self.getView().setBusy(true);

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
				MaterialPricingItemsSet: [],
				QuotationItemSet: []
			};

			obj.QuotationItemSet.push({
				QuotationNo: header.QuotationNo,
				Version: header.Version,
				ItemNo: "000010",
				Matnr: selMat.Matnr,
				Werks: selMat.Werks,
				Factor: selMat.Factor.toString(),
				IndividualLength: selMat.IndividualLength.toString(),
				Vrkme: selMat.Vrkme
			});

			pricingManual.forEach(function (x) {
				obj.MaterialPricingItemsSet.push({
					QuotationNo: header.QuotationNo,
					ItemNo: "000010",
					Version: header.Version,
					Kschl: x.Kschl,
					Text: x.Vtext,
					Kwert: typeof x.Kwert === "string" ? x.Kwert : x.Kwert.toString(),
					Kpein: x.Kpein,
					Kmein: x.Meins,
					Waers: x.Currency
				});
			});

			oModel.create("/MaterialPricingHeadSet", obj, {
				async: true,
				success: function (result) {
					self.getView().setBusy(false);

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
								if (x.Kbetr !== 0) {
									x.Show = true;
								} else {
									x.Show = false;
								}
								selMat.Pricing.push(x);
							});
						}

						first.NetValue = Math.round(parseFloat(first.NetValue) * 100) / 100;

						selMat.Netwr = first.NetValue;
						selMat.Waerk = first.Currency;
						selMat.Vrkme = first.Meins;

						oGlobalModel.setProperty("/selectedMaterial", selMat);
						self.calculateHeaderPrice();
					} else {

						selMat.Netwr = 0;

						oGlobalModel.setProperty("/selectedMaterial", selMat);
					}
					self.getView().setBusy(false);
				},
				error: function (result, b) {
					self.getView().setBusy(false);
				}
			});
		},
		onAddToConditions: function () {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				selManualCond = oGlobalModel.getProperty("/selectedManualCond"),
				manualConds = oGlobalModel.getProperty("/manualConditions"),
				selMaterial = oGlobalModel.getProperty("/selectedMaterial");

			if (!selManualCond.Kschl) {
				MessageBox.show("Empty Selection", MessageBox.Icon.ERROR);
				return;
			}
			var newCond = {};
			newCond.Kschl = selManualCond.Kschl;
			newCond.Text = selManualCond.Vtext;
			newCond.Kwert = selManualCond.Kwert;
			newCond.Kpein = selManualCond.Kpein;
			newCond.Manual = true;
			if (selManualCond.Krech === "A") {
				newCond.Kmein = "";
				newCond.Waers = "";
			} else {
				newCond.Kmein = selMaterial.Vrkme;
				newCond.Waers = selMaterial.Waerk;
			}
			manualConds = manualConds.filter(function (value, index, arr) {
				return value.Kschl !== selManualCond.Kschl;
			});
			if (!selMaterial.Pricing) {
				selMaterial.Pricing = [];
			}
			selMaterial.Pricing.splice(0, 0, newCond);
			oGlobalModel.setProperty("/selectedMaterial/Pricing", selMaterial.Pricing);
			oGlobalModel.setProperty("/manualConditions", manualConds);
			oGlobalModel.setProperty("/selectedManualCond", {});
			self.onGetPricing();
		},
		onListSelect: function (oEvent) {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				selectedItem = oGlobalModel.getProperty(oEvent.getParameter('selectedItem').getBindingContext("globalModel").getPath());
			oGlobalModel.setProperty("/selectedManualCond", selectedItem);
		},
		onDeleteCondition: function (oEvent) {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				condition = oEvent.getSource().getBindingContext("globalModel").getObject(),
				pricing = oGlobalModel.getProperty("/selectedMaterial/Pricing"),
				manualConds = oGlobalModel.getProperty("/manualConditions");

			pricing = pricing.filter(function (value, index, arr) {
				return value.Kschl !== condition.Kschl;
			});
			manualConds.push({
				Kschl: condition.Kschl,
				Vtext: condition.Text,
				Krech: condition.Krech
			});
			oGlobalModel.setProperty("/selectedMaterial/Pricing", pricing);
			oGlobalModel.setProperty("/manualConditions", manualConds);
			self.onGetPricing();
		},
		onUpdateItem: function () {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				selMat = jQuery.extend(true, {}, oGlobalModel.getProperty("/selectedMaterial")),
				headerPrice = oGlobalModel.getProperty("/quotationSelected/NetValue"),
				cart = oGlobalModel.getProperty("/cart"),
				successMsg = self.getView().getModel("i18n").getResourceBundle().getText("IDVcartSuccessMsg"),
				successTitle = self.getView().getModel("i18n").getResourceBundle().getText("IDVcartSuccessTitle"),
				newItemText = self.getView().getModel("i18n").getResourceBundle().getText("IDVnewItem"),
				goToCartText = self.getView().getModel("i18n").getResourceBundle().getText("IDVgoToCart");

			//headerPrice = (parseInt(headerPrice) + selMat.Netwr).toString();
			//cart.push(selMat);

			oGlobalModel.setProperty("/quotationSelected/NetValue", headerPrice);
			oGlobalModel.setProperty("/cart", cart);

			successMsg = successMsg.replace("&", selMat.ItemNo);

			//MessageBox.show(self.getView().getModel("i18n").getResourceBundle().getText("IDVcartSuccess"), MessageBox.Icon.SUCCESS);
			MessageBox.success(successMsg, {
				title: successTitle,
				actions: [newItemText, goToCartText],
				emphasizedAction: goToCartText,
				initialFocus: goToCartText,
				onClose: function (sAction) {
					switch (sAction) {
					case newItemText:
						self.onNavBack();
						break;
					case goToCartText:
						self.getRouter().navTo("Cart");
						break;
					}
				}
			});
		},
		onAddToCart: function (oEvent) {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				selMat = jQuery.extend(true, {}, oGlobalModel.getProperty("/selectedMaterial")),
				headerPrice = oGlobalModel.getProperty("/quotationSelected/NetValue"),
				cart = oGlobalModel.getProperty("/cart"),
				successMsg = self.getView().getModel("i18n").getResourceBundle().getText("IDVcartSuccessMsg"),
				successTitle = self.getView().getModel("i18n").getResourceBundle().getText("IDVcartSuccessTitle"),
				newItemText = self.getView().getModel("i18n").getResourceBundle().getText("IDVnewItem"),
				goToCartText = self.getView().getModel("i18n").getResourceBundle().getText("IDVgoToCart");

			if (!cart) {
				cart = [];
			}

			headerPrice = (parseInt(headerPrice, 10) + selMat.Netwr).toString();
			cart.push(selMat);

			oGlobalModel.setProperty("/headerInfo/headerInfoQuotationCart", cart.length);
			oGlobalModel.setProperty("/quotationSelected/NetValue", headerPrice);
			oGlobalModel.setProperty("/cart", cart);

			successMsg = successMsg.replace("&", selMat.ItemNo);

			//MessageBox.show(self.getView().getModel("i18n").getResourceBundle().getText("IDVcartSuccess"), MessageBox.Icon.SUCCESS);
			MessageBox.success(successMsg, {
				title: successTitle,
				actions: [newItemText, goToCartText],
				emphasizedAction: goToCartText,
				initialFocus: goToCartText,
				onClose: function (sAction) {
					switch (sAction) {
					case newItemText:
						self.onNavBack();
						break;
					case goToCartText:
						self.getRouter().navTo("Cart");
						break;
					}
				}
			});
		},
		getItemMetals: function () {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel"),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				metalConds = oGlobalModel.getProperty("/metalsInfo/conditions"),
				metalCustTab = oGlobalModel.getProperty("/metalsInfo/customizingTab"),
				header = oGlobalModel.getProperty("/quotationSelected"),
				selMat = oGlobalModel.getProperty("/selectedMaterial");

			var obj = {
				QuotationNo: header.QuotationNo,
				Version: header.Version,
				MetalsConditionsSet: metalConds,
				MetalsItemDataSet: [{
					Org: oGlobalModel.getProperty("/userInfo/salesOrganization"),
					Posnr: selMat.ItemNo,
					//Audat: item.reqDate.toSapDate(),
					//Parnr: header.oModel.oData.masterData.selected.external_key,
					Matnr: selMat.Matnr,
					Werks: selMat.Werks,
					Vtweg: oGlobalModel.getProperty("/userInfo/distributionChannel"),
					Waerk: oGlobalModel.getProperty("/userInfo/currency")
						//Blart: header.oModel.oData.headerData.auart,
						//Prsdt: item.reqDate.toSapDate(),
						//Vkbur: header.oModel.oData.headerData.vkbur
				}],
				MetalsRowsSet: []
			};

			self.getView().setBusy(true);

			oModel.create("/MetalsOderHeaderSet", obj, {
				async: true,
				success: function (result) {
					self.getView().setBusy(false);

					if (result.MetalsRowsSet.results && result.MetalsRowsSet.results.length &&
						result.MetalsRowsSet.results.length > 0) {

						result.MetalsRowsSet.results.forEach(function (x) {
							var custom;
							x.NetRate = (x.Nku - x.Bwr).toFixed(2);
							//x.nfs_unbinded = x.Nfs;
							if (x.Ndt) {
								//x.ndtParsed =  x.Ndt.convertDate({outputDate: true});
							} else {
								//x.ndtParsed = null;
							}
							if (x.Nfs) {
								if (metalCustTab) {
									custom = metalCustTab.filter(function (y) {
										return y.Nfs === x.Nfs;
									})[0];
									if (custom) {
										x.Txt = custom.Txt;
									}
								}
							}
						});

						oGlobalModel.setProperty("/metalsInfo/itemMetals", result.MetalsRowsSet.results);
					} else {
						oGlobalModel.setProperty("/metalsInfo/itemMetals", []);
					}
				},
				error: function (result, b) {
					self.getView().setBusy(false);
				}
			});
		},
		onChangeCustomizing: function (oEvent) {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				selKey = oGlobalModel.getProperty("/metalsInfo/selectedCustomKey"),
				conditions = oGlobalModel.getProperty("/metalsInfo/conditions"),
				customizing = oGlobalModel.getProperty("/metalsInfo/customizing"),
				selCustomizing = customizing[selKey],
				selectedItemPath = oGlobalModel.getProperty(oEvent.getSource().getParent().getBindingContext("globalModel").getPath());

			if (selCustomizing) {

				var condToModify = conditions.filter(function (y) {
					return selectedItemPath.Nes === y.Nes;
				})[0];

				if (condToModify) {
					condToModify.Nfs = selKey;
					condToModify.Neb = selectedItemPath.Neb;
					condToModify.Bsl = selectedItemPath.Bsl;
					condToModify.Ndt = selectedItemPath.Ndt;
					condToModify.Nku = selectedItemPath.Nku;
					condToModify.Bek = selectedItemPath.Bek;
					condToModify.Bcu = selectedItemPath.Bcu;
					condToModify.Eind = selectedItemPath.Eind;
					condToModify.Eds = selectedItemPath.Eds;
					if (selectedItemPath.Neb === "99") {
						condToModify.Bwr = selectedItemPath.Bwr;
					}

					self.getItemMetals();
				}
			}
		},
		onBasePress: function (oEvent) {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				bases = oGlobalModel.getProperty("/metalsInfo/bases"),
				selectedItem = oGlobalModel.getProperty(oEvent.getSource().getParent().getBindingContext("globalModel").getPath());

			if (!self.fragmentBaseTable) {
				self.fragmentBaseTable = sap.ui.xmlfragment(self.getView().getId(),
					"zotc_easyquote.zotc_easyquote.fragment.BaseTable",
					self);
				self.getView().addDependent(self.fragmentBaseTable);
			}

			oGlobalModel.setProperty("/metalsInfo/currentBases", bases[selectedItem.Nes]);
			oGlobalModel.setProperty("/metalsInfo/currentMetalItem", selectedItem);

			self.fragmentBaseTable.open();
		},
		oncloseBaseTable: function () {
			var self = this;
			self.fragmentBaseTable.close();
		},
		onCoveragePress: function (oEvent) {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				coverage = oGlobalModel.getProperty("/metalsInfo/coverage"),
				customizing = oGlobalModel.getProperty("/metalsInfo/customizing"),
				selectedItem = oGlobalModel.getProperty(oEvent.getSource().getParent().getBindingContext("globalModel").getPath()),
				currentCoverage = [],
				eins,
				eink;

			if (!self.fragmentCoverageTable) {
				self.fragmentCoverageTable = sap.ui.xmlfragment(self.getView().getId(),
					"zotc_easyquote.zotc_easyquote.fragment.CoverageTable",
					self);
				self.getView().addDependent(self.fragmentCoverageTable);
			}

			if (coverage) {
				currentCoverage = coverage[selectedItem.Nes];
			}

			eins = customizing[selectedItem.Nfs].Eins;
			eink = customizing[selectedItem.Nfs].Eink;

			if (currentCoverage && currentCoverage.length && currentCoverage.length > 0) {
				if (eins === "X") {
					oGlobalModel.setProperty("/metalsInfo/currentCoverage", currentCoverage.filter(function (x) {
						x.Left = (parseFloat(x.Edb) - parseFloat(x.Aub)).toFixed(3);
						if (!x.Ste) {
							x.Ste = "00000000";
						}
						if (!x.Gbd) {
							x.Gbd = "00000000";
						}
						return x.Ste !== null && x.Ste !== undefined && x.Ste !== "" && parseInt(x.Ste, 10) !== 0;
					}));
				}
				if (eink === "X") {
					oGlobalModel.setProperty("/metalsInfo/currentCoverage", currentCoverage.filter(function (x) {
						x.Left = (parseFloat(x.Edb) - parseFloat(x.Aub)).toFixed(3);
						if (!x.Ste) {
							x.Ste = "00000000";
						}
						if (!x.Gbd) {
							x.Gbd = "00000000";
						}
						return x.Efk !== null && x.Efk !== undefined && parseFloat(x.Efk) !== 0;
					}));
				}
			}

			oGlobalModel.setProperty("/metalsInfo/currentMetalItem", selectedItem);
			self.fragmentCoverageTable.open();
		},
		oncloseCoverageTable: function () {
			var self = this;
			self.fragmentCoverageTable.close();
		},
		onBaseSelection: function (oEvent) {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				item = oGlobalModel.getProperty("/metalsInfo/currentMetalItem"),
				selectedBase = oEvent.getParameter("listItem").getBindingContext("globalModel").getObject(),
				conditions = oGlobalModel.getProperty("/metalsInfo/conditions"),
				canEditBaseKey = oGlobalModel.getProperty("/metalsInfo/canEditBaseKey"),
				i;

			item.Neb = selectedBase.Neb;
			item.Bcu = selectedBase.Bcu || oGlobalModel.getProperty("/userInfo/currency");
			item.Bwr = selectedBase.Bwr;

			for (i = 0; i < conditions.length; i = i + 1) {
				if (conditions[i].Nes === item.Nes) {
					conditions[i].Neb = selectedBase.Neb;
					conditions[i].Bcu = selectedBase.Bcu;
					conditions[i].Bwr = selectedBase.Bwr;
					break;
				}
			}

			if (selectedBase.Neb === "99") {
				canEditBaseKey[item.Nes] = true;
			} else {
				canEditBaseKey[item.Nes] = false;
			}

			self.getItemMetals();
			self.fragmentBaseTable.close();
		},
		onCoverageSelection: function (oEvent) {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				item = oGlobalModel.getProperty("/metalsInfo/currentMetalItem"),
				selectedCoverage = oEvent.getParameter("listItem").getBindingContext("globalModel").getObject(),
				conditions = oGlobalModel.getProperty("/metalsInfo/conditions"),
				i,
				tmp_date_from,
				tmp_date_to,
				today = new Date(),
				errorMsg = self.getView().getModel("i18n").getResourceBundle().getText("CTFexpiredCoverage"),
				selectItemRoutine = function () {
					item.Eind = selectedCoverage.Parnr;
					item.Eds = selectedCoverage.Eds;
					item.Nku = selectedCoverage.Efk;

					for (i = 0; i < conditions.length; i = i + 1) {
						if (conditions[i].Nes === item.Nes) {
							conditions[i].Eind = selectedCoverage.Parnr;
							conditions[i].Eds = selectedCoverage.Eds;
							break;
						}
					}

					self.getItemMetals();
					self.fragmentCoverageTable.close();
				};

			if (selectedCoverage.Gbd && selectedCoverage.Ste) {
				tmp_date_from = self.convertDate({
					value: selectedCoverage.Ste,
					outputDate: true
				});
				tmp_date_to = self.convertDate({
					value: selectedCoverage.Gbd,
					outputDate: true
				});
				if (today < tmp_date_from || today > tmp_date_to) {
					MessageBox.show(errorMsg, MessageBox.Icon.ERROR);
				} else {
					selectItemRoutine();
				}
			} else {
				selectItemRoutine();
			}
		},
		onShowExpert: function () {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				pricing = oGlobalModel.getProperty("/selectedMaterial/Pricing");

			oGlobalModel.setProperty("/expertMode", true);
			pricing.forEach(function (x) {
				x.Show = true;
			});
			oGlobalModel.setProperty("/selectedMaterial/Pricing", pricing);
		},
		onHideExpert: function () {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				pricing = oGlobalModel.getProperty("/selectedMaterial/Pricing");

			oGlobalModel.setProperty("/expertMode", false);
			pricing.forEach(function (x) {
				if (x.Kbetr !== 0) {
					x.Show = true;
				} else {
					x.Show = false;
				}
			});
			oGlobalModel.setProperty("/selectedMaterial/Pricing", pricing);
		},
		getItemExtendedTexts: function (oEvent) {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel"),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				customer = oGlobalModel.getProperty("/quotationSelected/CustomerId"),
				selMat = oGlobalModel.getProperty("/selectedMaterial"),
				oDataFilters = [];

			selMat.CustomTexts = [];

			oDataFilters.push(new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.EQ, selMat.Matnr));
			oDataFilters.push(new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.EQ, selMat.Werks));
			oDataFilters.push(new sap.ui.model.Filter("Kunnr", sap.ui.model.FilterOperator.EQ, customer));

			oModel.read("/ItemExtendedTextsSet", {
				filters: oDataFilters,
				async: false,
				success: function (oData, result) {
					selMat.CustomTexts = oData.results;
					oGlobalModel.setProperty("/selectedMaterial", selMat);
					self.getView().byId("itemSelectText").setSelectedIndex(0);
					self.getContentExtendedText(self.getView().byId("itemSelectText").getSelectedKey());
				},
				error: function (result, b) {
					oGlobalModel.setProperty("/selectedMaterial", selMat);
				}
			});
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
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			oGlobalModel.setProperty("/selectedMaterial/selExtendedTextCode", textId);
			oGlobalModel.setProperty("/selectedMaterial/selExtendedTextValue", textValue);

			if (oGlobalModel.getProperty("/selectedMaterial/ContentTexts").length) {
				oGlobalModel.getProperty("/selectedMaterial/ContentTexts").forEach(function (x) {
					if (x.Tdid === textId) {
						oGlobalModel.setProperty("/selectedMaterial/selContentText", x.Text);
						flagEmpty = false;
					}
				});
			}

			if (flagEmpty) {
				oGlobalModel.setProperty("/selectedMaterial/selContentText", "");
			}

		},

		changeContentText: function (oEvent) {
			var self = this;
			var flag = false; //verifica che esiste già un content text associato all'extended text
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			if (oGlobalModel.getProperty("/selectedMaterial/selExtendedTextCode")) {
				oGlobalModel.getProperty("/selectedMaterial/ContentTexts").forEach(function (x) {
					if (x.Tdid === oGlobalModel.getProperty("/selectedMaterial/selExtendedTextCode")) {
						x.Text = oEvent.getSource().getValue();
						flag = true;
					}
				});

				if (!flag) {
					if (!oGlobalModel.getProperty("/selectedMaterial/selExtendedTextValue")) { //quando è selezionato il primo extended text di default
						oGlobalModel.getProperty("/selectedMaterial/CustomTexts").forEach(function (x) {
							if (x.Tdid === oGlobalModel.getProperty("/selectedMaterial/selExtendedTextCode")) {
								oGlobalModel.setProperty("/selectedMaterial/selExtendedTextValue", x.Tdtext);
							}
						});
					}

					oGlobalModel.getProperty("/selectedMaterial/ContentTexts").push({
						QuotationNo: oGlobalModel.getProperty("/quotationSelected/QuotationNo") ? oGlobalModel.getProperty(
							"/quotationSelected/QuotationNo") : "",
						Version: oGlobalModel.getProperty("/quotationSelected/Version") ? oGlobalModel.getProperty(
							"/quotationSelected/Version") : "",
						ItmNumber: oGlobalModel.getProperty("/selectedMaterial/ItemNo"),
						Langu: oGlobalModel.getProperty("/userInfo/language"),
						Tdid: oGlobalModel.getProperty("/selectedMaterial/selExtendedTextCode"),
						Tdtext: oGlobalModel.getProperty("/selectedMaterial/selExtendedTextValue"),
						Text: oEvent.getSource().getValue()

					});
				}

			}
			oGlobalModel.refresh(true);
		},
		getItemChars: function () {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel"),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				selMat = oGlobalModel.getProperty("/selectedMaterial");

			var obj = {
				Matnr: selMat.Matnr,
				Werks: selMat.Werks,
				MaterialCharsSet: [],
				MaterialCharsValuesSet: []
			};

			if (!selMat.Chars) {
				selMat.Chars = [];
			}

			self.getView().setBusy(true);

			oModel.create("/MaterialCharsHeadSet", obj, {
				async: true,
				success: function (result) {
					self.getView().setBusy(false);

					result.MaterialCharsSet.results.forEach(function (char) {
						char.Values = result.MaterialCharsValuesSet.results.filter(function (value) {
							return value.NameChar === char.NameChar;
						});
						if (char.Values.length > 0) {
							var empty = {
								CharValue: "",
								DescrCval: ""
							};
							char.Values.splice(0, 0, empty);
							char.InputMode = "S";
						} else {
							char.InputMode = "I";
						}

						char.DescrCval = "";
						char.ShowItemDetailsTable = false;
						if (char.DataType === "NUM") {
							char.CharValue.replace(",", ".");
						}

						var exist = selMat.Chars.find(function (x) {
							return x.NameChar === char.NameChar;
						});
						if (exist) {
							exist.Values = char.Values;
							if (char.CharValue !== "") {
								exist.Default = char.CharValue;
								if (exist.Default !== exist.CharValue) {
									char.ShowItemDetailsTable = true;
								}
								if (char.Values.length > 0) {
									exist.DescrCval = "- " + char.Values.find(function (x) {
										return char.CharValue === x.CharValue;
									}).DescrCval;
								}
							}
						} else {
							if (char.CharValue !== "") {
								char.Default = char.CharValue;
								if (char.Values.length > 0) {
									char.DescrCval = "- " + char.Values.find(function (x) {
										return char.CharValue === x.CharValue;
									}).DescrCval;
								}
							}
							selMat.Chars.push(char);
						}
					});
					oGlobalModel.setProperty("/selectedMaterial", selMat);
				},
				error: function (result, b) {
					self.getView().setBusy(false);
				}
			});
		},
		onShowChars: function (oEvent) {
			var self = this;

			if (!self.fragmentMaterialChars) {
				self.fragmentMaterialChars = sap.ui.xmlfragment(self.getView().getId(),
					"zotc_easyquote.zotc_easyquote.fragment.MaterialCharsTable",
					self);
				self.getView().addDependent(self.fragmentMaterialChars);
			}

			self.fragmentMaterialChars.open();
		},
		oncloseMaterialChars: function () {
			var self = this;
			self.fragmentMaterialChars.close();
		},
		onInputNumberChange: function (oEvent) {
			var self = this,
				path = oEvent.getSource().getBindingContext("globalModel").getPath(),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				selChar = oGlobalModel.getProperty(path),
				bNotnumber = isNaN(oEvent.getParameter("value"));

			if (selChar.DataType === "NUM") {
				if (bNotnumber === false) {
					selChar.CharValue = oEvent.getParameter("value");
					self.checkShowItemTable(selChar);
				} else {
					oEvent.getSource().setValue(selChar.CharValue);
				}
				oGlobalModel.setProperty(path, selChar);
			} else {
				self.checkShowItemTable(selChar);
			}
		},
		onSelectCharChange: function (oEvent) {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				path = oEvent.getSource().getBindingContext("globalModel").getPath(),
				selChar = oGlobalModel.getProperty(path);

			self.checkShowItemTable(selChar);
			selChar.DescrCval = "- " + selChar.Values.find(function (x) {
				return selChar.CharValue === x.CharValue;
			}).DescrCval;
			oGlobalModel.setProperty(path, selChar);
		},
		checkShowItemTable: function (selChar) {
			if (selChar.Default) {
				if (selChar.CharValue === selChar.Default) {
					selChar.ShowItemDetailsTable = false;
				} else {
					selChar.ShowItemDetailsTable = true;
				}
			}
		},
		onRestoreDefaults: function () {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				selMat = oGlobalModel.getProperty("/selectedMaterial");

			if (selMat.Chars) {
				selMat.Chars.forEach(function (char) {
					if (char.Default) {
						char.CharValue = char.Default;
						char.ShowItemDetailsTable = false;
					}
				});
				oGlobalModel.setProperty("/selectedMaterial", selMat);
			}
		}
	});
});