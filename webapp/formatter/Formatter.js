	sap.ui.define([
		"sap/ui/Device",
		"sap/ui/core/format/NumberFormat",
	], function (Device, NumberFormat) {
		"use strict";

		return {
			availabilityFormatter: function (val) {
				if (val === "A") {
					return "Available";
				}
				if (val === "O") {
					return "Available in other plants";
				}
				return "Not available";
			},
			deleteZeros: function (val) {
				var arr = [];

				if (val) {
					arr = val.split("");
					while (arr[0] === "0") {
						arr.shift();
					}
					val = arr.join("");
				} else {
					val = "";
				}
				return val;
			},

			formatEditContactPersonList: function (sap, del) {
				if (sap == "X") {
					return false;
				}
				if (del == "X") {
					return false;
				}
				return true;
			},
			convertDate: function (config) {
				var settings = $.extend({
						date: null,
						outputDate: false
					}, config),
					obj = settings.date,
					anno,
					mese,
					giorno;

				if (obj) {
					if (obj.match(/[0-9]{2}[-\.\/][0-9]{2}[-\.\/][0-9]{4}/g) !== null) {
						giorno = obj.substring(0, 2);
						mese = obj.substring(3, 5);
						anno = obj.substring(6, 10);
					} else {
						anno = obj.substring(0, 4);
						mese = obj.substring(4, 6);
						giorno = obj.substring(6, 8);
					}
					if (settings.outputDate) {
						return new Date(parseInt(anno, 10), parseInt(mese, 10) - 1, parseInt(giorno, 10));
					}
					return giorno + "/" + mese + "/" + anno;
				}
				return null;
			},

			iconExtendedText: function (val) {
				var self = this;
				var flag = false;
				var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

				if (oGlobalModel.getProperty("/contentTexts").length > 0) {
					oGlobalModel.getProperty("/contentTexts").forEach(function (x) {
						if (val === x.Tdid) {
							if (x.Text) {
								flag = true;
								return "sap-icon://add";
							} else {
								flag = false;
								return "sap-icon://document";
							}
						}
					});
				}

				if (flag) {
					return "sap-icon://request";
				} else {
					return "sap-icon://document";
				}
			},
			iconItemExtendedText: function (val) {
				var self = this;
				var flag = false;
				var oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
					selMat = oGlobalModel.getProperty("/selectedMaterial");

				if (selMat.ContentTexts.length > 0) {
					selMat.ContentTexts.forEach(function (x) {
						if (val === x.Tdid) {
							if (x.Text) {
								flag = true;
								return "sap-icon://add";
							} else {
								flag = false;
								return "sap-icon://document";
							}
						}
					});
				}

				if (flag) {
					return "sap-icon://request";
				} else {
					return "sap-icon://document";
				}
			},

			formatDate: function (fDate) {
				let dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
					pattern: "dd.MM.yyyy"
				});

				if (fDate) {
					fDate = new Date(fDate === undefined ? null : fDate);

					return dateFormat.format(fDate);
				} else {
					return "";
				}
			},

			formatNumber: function (fNumber) {
				if (fNumber) {
					let oNF2e = NumberFormat.getFloatInstance({
						maxFractionDigits: 2,
						minFractionDigits: 2,
						decimalSeparator: ",",
						groupingEnabled: true,
						groupingSeparator: " "
					});
					return oNF2e.format(fNumber);
				}
			},

			formatHeaderQuotation: function (quotationNo, quotationVer) {
				var self = this;
				var txt;

				if (quotationNo && quotationVer) {
					txt = self.getView().getModel("i18n").getResourceBundle().getText("quotation");
					return txt + ": " + quotationNo + " / " + quotationVer;
				} else {
					txt = self.getView().getModel("i18n").getResourceBundle().getText("newQuotation");
					return txt;
				}
			},

			formatHeaderQuotationCustomerName: function (salesOrg, distributionChannel, customerName) {
				//Se l'utente preme "Create" nascondo il customerName
				var ret = salesOrg + " / " + distributionChannel;
				if (customerName) {
					return ret + " / " + customerName;
				} else {
					return ret
				}
			},

			formatCustomerSearchHelp: function (id, name) {
				if (id && name) {
					return id + " - " + name;
				} else {
					return "";
				}
			},

			formatIconCart: function (numItems) {

				if (!numItems) {
					return "sap-icon://cart";
				} else {
					return "sap-icon://cart-full";
				}
			},

			formatDataSalesPage: function (dataPar) {
				var oDate = new sap.m.DateTimeInput();

				if (dataPar) {
					oDate.setValueFormat("yyyy-MM-ddTHH:mm:ss");
					oDate.setDisplayFormat("dd MMM, yyyy");
					oDate.setDateValue(dataPar);
					return oDate.getValue();
				} else {
					return "";
				}
			},

			formatStatus: function (status) {
				var self = this;
				var oGlobalModel = self.getOwnerComponent().getModel("globalModel")

				var text = oGlobalModel.getProperty("/statusList").filter(function (x) {
					return x.key === status
				})

				return text[0].value ? text[0].value : status;
			},

			formatModeTableCart: function (SapQuotationNo) {

				if (!SapQuotationNo) {
					return "MultiSelect";
				} else {
					return "None";
				}

			}
		};
	});