sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	'sap/ui/core/Fragment',
	'sap/m/MessageToast',
	'sap/ui/core/Popup',
	'sap/ui/core/UIComponent'

], function (Controller, History, JSONModel, Fragment, MessageToast, Popup, UIComponent) {
	"use strict";

	return Controller.extend("zotc_easyquote.zotc_easyquote.controller.BaseController", {

		getRouter: function () {
			return UIComponent.getRouterFor(this);
		},

		onNavBack: function (oEvent) {
			var self = this;
			var oHistory, sPreviousHash;

			oHistory = History.getInstance();
			sPreviousHash = oHistory.getPreviousHash();

			self.getRouter().navTo("HomePage", {}, true /*no history*/ );
		},

		validateEmailBC: function (pEmail) {
			var self = this;

			var email = pEmail.getValue();
			var mailregex = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;

			if (!mailregex.test(email)) {
				if (pEmail === '') {
					return false; //empty e-mail
				} else {
					return false; //invalid e-mail
				}
			} else {
				return true;
			}
		},

		validatePhoneBC: function (pPhone) {
			var self = this;

			var phone = pPhone.getValue();
			// var phoneregex = /^[0-9]*$/;
			var phoneregex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;

			if (!phoneregex.test(phone) || phone.length < 10) {
				if (phone === '') {
					return true; //empty e-mail
				} else {
					return false; //invalid phone
				}
			} else {
				return true;
			}
		},

		generateGuidBC: function () {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxx'.replace(/[xy]/g, function (c) {
				var r = Math.random() * 16 | 0,
					v = c == 'x' ? r : (r & 0x3 | 0x8);
				return v.toString(16);
			});
		},

		onSaveQuoteBC: function (modePar, showMessage) {
			var self = this,
				oModel = self.getOwnerComponent().getModel("oDataModel"),
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				header = oGlobalModel.getProperty("/quotationSelected"),
				cart = oGlobalModel.getProperty("/cart"),
				contentTexts = oGlobalModel.getProperty("/contentTexts");
			var txt;
			var dateQuotationDate, dateQuotationValid;
			var viewStateModel = self.getView().getModel("viewState");
			var def = jQuery.Deferred();
			var flagRequiredFields;
			var status;

			self.getView().setBusyIndicatorDelay(0);
			self.getView().setBusy(true);

			flagRequiredFields = self.checkRequiredFieldsBC();

			if (header.Status === "SentToSap" || header.Status === "Lost" || header.Status === "Closed") {
				status = header.Status;
			} else {

				if (flagRequiredFields) {
					status = "Open";
				} else {
					status = "Draft";
				}
			}

			if (header.QuotationDate) {
				dateQuotationDate = new Date(header.QuotationDate);
				dateQuotationDate.setHours("12");
			}
			if (header.QuotationValid) {
				dateQuotationValid = new Date(header.QuotationValid);
				dateQuotationValid.setHours("12");
			}

			var obj = {
				QuotationNo: header.QuotationNo,
				Version: header.Version,
				VersionName: header.VersionName,
				Bname: modePar === 'E' ? header.Bname : oGlobalModel.getProperty("/userInfo/userName"), //se in edit rimane il Bname, se in create o "copy" utilizza quello dell'utente loggato
				CompanyCode: header.CompanyCode,
				SalesOrganization: header.SalesOrganization,
				SalesOffice: header.SalesOffice,
				SalesGroup: header.SalesGroup,
				CustomerId: header.CustomerId,
				DistributionChannel: header.DistributionChannel,
				ShipToParty: header.ShipToParty,
				ShipToAddress: header.ShipToAddress,
				ContactPerson: header.ContactPerson,
				ContactPersonFromSap: header.ContactPersonFromSap,
				PaymentTerm: header.PaymentTerm,
				PaymentTermName: header.PaymentTermName,
				DeliveryTerm: header.DeliveryTerm,
				DeliveryTerm2: header.DeliveryTerm2,
				QuotationName: header.QuotationName,
				QuotationDate: dateQuotationDate,
				QuotationValid: dateQuotationValid,
				SalesCurrency: header.SalesCurrency,
				Comments: header.Comments,
				Status: status,
				StatusLostReason: header.StatusLostReason,
				Drum: header.Drum,
				FreightCost: header.FreightCost,
				NetValue: header.NetValue,
				CustomerName: header.CustomerName,
				Alc: header.Alc,
				Cuc: header.Cuc,
				Pbc: header.Pbc,
				Als: header.Als,
				Cus: header.Cus,
				Rounding: header.Rounding,
				ExchangeRate: header.ExchangeRate,
				DrumCost: header.DrumCost,
				Pbs: header.Pbs,
				CustomerAddressCity: header.CustomerAddressCity,
				CustomerAddressPostcode: header.CustomerAddressPostcode,
				CustomerAddressStreet: header.CustomerAddressStreet,
				CustomerAddressHouse: header.CustomerAddressHouse,
				CustomerAddressCountry: header.CustomerAddressCountry,
				ShipToAddressCity: header.ShipToAddressCity,
				ShipToAddressPostcode: header.ShipToAddressPostcode,
				ShipToAddressStreet: header.ShipToAddressStreet,
				ShipToAddressHouse: header.ShipToAddressHouse,
				ShipToAddressCountry: header.ShipToAddressCountry,
				QuotationSaveDt: header.QuotationSaveDt,
				QuotationSaveTm: header.QuotationSaveTm,
				SapQuotationNo: modePar === 'E' ? header.SapQuotationNo : "",
				Language: header.Language,
				ShipToPartyName: header.ShipToPartyName,
				Cm: header.Cm,
				Cost: header.Cost,
				Material: header.Material,
				HeaderText: header.HeaderText,
				FreeText: header.FreeText,
				UnreadNotifications: header.UnreadNotifications,
				NetValueEur: header.NetValueEur,
				ContentTextsSet: contentTexts,
				Mode: modePar,
				Title: header.Title,
				SalesDocumentType: oGlobalModel.getProperty("/userInfo/salesDocumentType"),
				Tag: header.Tag,
				QuotationItemSet: [],
				MaterialPricingItemsSet: [],
				MaterialCharsSet: []
			};

			if (cart) {
				cart.forEach(function (x) {
					obj.QuotationItemSet.push({
						Version: header.Version,
						QuotationNo: header.QuotationNo,
						ItemNo: x.ItemNo,
						Matnr: x.Matnr,
						Maktx: x.Maktx,
						Factor: x.Factor.toString(),
						Vrkme: x.Vrkme,
						IndividualLength: x.IndividualLength.toString(),
						Werks: x.Werks,
						Kwmeng: (x.Factor * x.IndividualLength).toString(),
						Waerk: x.Waerk,
						Netwr: x.Netwr.toString()
					});

					if (x.Pricing) {
						x.Pricing.forEach(function (y) {
							if (y.Manual === true) {
								obj.MaterialPricingItemsSet.push({
									Version: header.Version,
									QuotationNo: header.QuotationNo,
									ItemNo: x.ItemNo,
									Kschl: y.Kschl,
									Matnr: x.Matnr,
									NetValue: y.NetValue.toString(),
									NetPrice: y.NetPrice,
									NetPriceLength: y.NetPriceLength,
									NetPriceMeasure: y.NetPriceMeasure,
									Currency: y.Currency,
									SalesUnit: y.SalesUnit,
									TaxAmount: y.TaxAmount,
									Kawrt: y.Kawrt,
									Kpein: y.Kpein,
									Krech: y.Krech,
									Kbetr: y.Kbetr.toString(),
									Kwert: y.Kwert.toString(),
									Kmein: y.Kmein,
									Waers: y.Waers,
									Kwaeh: y.Kwaeh,
									Kherk: y.Kherk,
									Kinak: y.Kinak,
									Text: y.Text
								});
							}
						});
					}
					if (x.ContentTexts && x.ContentTexts.length > 0) {
						x.ContentTexts.forEach(function (y) {
							obj.ContentTextsSet.push({
								Version: header.Version,
								QuotationNo: header.QuotationNo,
								ItmNumber: x.ItemNo,
								Tdid: y.Tdid,
								Tdtext: y.Tdtext,
								Text: y.Text,
								Langu: y.Langu
							});
						});
					}
					if (x.Chars && x.Chars.length > 0) {
						x.Chars.forEach(function (char) {
							if (char.CharValue) {
								obj.MaterialCharsSet.push({
									Version: header.Version,
									QuotationNo: header.QuotationNo,
									ItemNo: x.ItemNo,
									NameChar: char.NameChar,
									DataType: char.DataType,
									CharValue: char.CharValue
								});
							}
						});
					}
				});
			}

			oModel.create("/QuotationSet", obj, {
				success: function (oData, oResponse) {
					oGlobalModel.setProperty("/updateTable", true);

					if (modePar === 'C') {
						if (oData.Version === "1") {
							txt = self.getView().getModel("i18n").getResourceBundle().getText("SAVEquoteCreated");
						} else { //Create new version
							txt = self.getView().getModel("i18n").getResourceBundle().getText("SAVEversion") + " " +
								oData.Version + " " + self.getView().getModel("i18n").getResourceBundle().getText("SAVEcreated");
						}
					} else if (modePar === 'E') {
						txt = self.getView().getModel("i18n").getResourceBundle().getText("SAVEquoteChanged");
					}

					oGlobalModel.setProperty("/quotationSelected", []);
					oGlobalModel.setProperty("/quotationSelected", oData);
					oGlobalModel.setProperty("/createMode", false);
					// self.byId("QuotationDateId").setDateValue(oGlobalModel.getProperty("/quotationSelected/QuotationDate"));
					// self.byId("QuotationDateValidId").setDateValue(oGlobalModel.getProperty("/quotationSelected/QuotationValid"));
					oGlobalModel.setProperty("/headerInfo/headerInfoQuotationNo", oGlobalModel.getProperty("/quotationSelected/QuotationNo"));
					oGlobalModel.setProperty("/headerInfo/headerInfoQuotationTitle", oGlobalModel.getProperty("/quotationSelected/Title"));
					oGlobalModel.setProperty("/headerInfo/headerInfoQuotationVersion", oGlobalModel.getProperty("/quotationSelected/Version"));
					oGlobalModel.setProperty("/headerInfo/quotationNetValue", oGlobalModel.getProperty("/quotationSelected/NetValue"));
					oGlobalModel.setProperty("/headerInfo/headerInfoQuotationSalesCurrency", oGlobalModel.getProperty(
						"/quotationSelected/SalesCurrency"));
					oGlobalModel.setProperty("/headerInfo/headerInfoQuotationCustomerId", oGlobalModel.getProperty(
						"/quotationSelected/CustomerId"));
					oGlobalModel.setProperty("/headerInfo/headerInfoQuotationCustomerName", oGlobalModel.getProperty(
						"/quotationSelected/CustomerName"));
					oGlobalModel.setProperty("/headerInfo/headerInfoQuotationStatus", oGlobalModel.getProperty("/quotationSelected/Status"));
					oGlobalModel.setProperty("/headerInfo/headerInfoQuotationSAP", oGlobalModel.getProperty("/quotationSelected/SapQuotationNo"));

					// viewStateModel.setProperty("/oldTitlePo", oGlobalModel.getProperty("/quotationSelected/Title"));

					oGlobalModel.refresh();

					if (!showMessage) { //se sto inviando la quotation su SAP non devo mostrare il messaggio

						self.getView().setBusy(false);

						MessageToast.show(txt, {
							duration: 1000,
							animationDuration: 1000
						});
						jQuery(".sapMMessageToast").addClass("sapMMessageToastSuccess");
					}

					def.resolve();
				},
				error: function () {
					self.getView().setBusy(false);
					txt = self.getView().getModel("i18n").getResourceBundle().getText("SAVEquoteNotCreated");
					MessageToast.show(txt, {
						duration: 1000,
						animationDuration: 1000
					});
					jQuery(".sapMMessageToast").addClass("sapMMessageToastWarning");

					def.reject();
				}
			});

			return def;
		},

		getMaxItemNoBC: function () {
			var self = this;
			var maxItemNo = 0;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");
			var cart = oGlobalModel.getProperty("/cart");

			if (cart.length > 0) {
				cart.forEach(function (x, index) {
					if (parseInt(x.ItemNo, 10) > parseInt(maxItemNo, 10)) {
						maxItemNo = parseInt(x.ItemNo, 10);
					}
				});
				return maxItemNo;
			} else {
				return 0;
			}
		},
		calculateHeaderPrice: function (param) {
			var self = this,
				oGlobalModel = self.getOwnerComponent().getModel("globalModel"),
				cart = oGlobalModel.getProperty("/cart"),
				headerPrice = 0,
				newPosition = 10;

			if (!cart) {
				cart = [];
			}

			if (param === "delete") {
				cart.forEach(function (x) {
					x.ItemNo = ("000000" + newPosition).slice(-6);
					headerPrice += parseInt(x.Netwr, 10);
					newPosition += 10;
				});
			} else {
				cart.forEach(function (x) {

					headerPrice += parseInt(x.Netwr, 10);

				});
			}

			oGlobalModel.setProperty("/headerInfo/headerInfoQuotationCart", cart.length);
			oGlobalModel.setProperty("/quotationSelected/NetValue", headerPrice.toString());
			oGlobalModel.setProperty("/cart", cart);

		},
		convertDate: function (config) {
			var settings = $.extend({
					value: null,
					outputDate: false,
					dateFormat: "dd-MM-yyyy",
					fromExcell: false
				}, config),
				anno,
				mese,
				giorno;

			if (settings.value) {
				var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
					pattern: "dd.MM.yyyy"
				});

				if (settings.value !== "00000000") {
					settings.value = new Date(settings.value === undefined ? null : settings.value);

					settings.value = dateFormat.format(settings.value);
				}
				if (settings.value.match(/[0-9]{2}[-\.\/][0-9]{2}[-\.\/][0-9]{4}/g) !== null) {
					if (settings.dateFormat === "dd-MM-yyyy") {
						giorno = settings.value.substring(0, 2);
						mese = settings.value.substring(3, 5);
						anno = settings.value.substring(6, 10);
					} else {
						mese = settings.value.substring(0, 2);
						giorno = settings.value.substring(3, 5);
						anno = settings.value.substring(6, 10);
					}

				} else {
					anno = settings.value.substring(0, 4);
					mese = settings.value.substring(4, 6);
					giorno = settings.value.substring(6, 8);
				}
				if (settings.outputDate) {
					return new Date(parseInt(anno, 10), parseInt(mese, 10) - 1, parseInt(giorno, 10));
				}
				return giorno + "/" + mese + "/" + anno;
			}
			return null;
		},

		/******** BEGIN CHECK PAGES ********/
		checkRequiredFieldsBC: function () {
			var self = this;
			var flagSalesDataPage = false,
				flagCustomerDataPage = false;

			flagSalesDataPage = self.checkSalesDataPageBC();
			flagCustomerDataPage = self.checkCustomerDataPageBC();

			if (flagSalesDataPage && flagCustomerDataPage) {
				return true;
			} else {
				return false;
			}
		},

		checkSalesDataPageBC: function () {
			var self = this;
			var flagQuotationDate = false,
				flagQuotationValid = false,
				flagTitlePo = false,
				flagProjectName = false;

			flagQuotationDate = self.checkQuotationDateBC();
			flagQuotationValid = self.checkQuotationValidBC();
			flagTitlePo = self.checkTitlePoBC();
			flagProjectName = self.checkProjectNameBC();

			if (flagQuotationDate && flagQuotationValid && flagTitlePo && flagProjectName) {
				return true;
			} else {
				return false;
			}
		},

		checkCustomerDataPageBC: function () {
			var self = this;
			var flagCustomerId = false;

			flagCustomerId = self.checkCustomerIdBC();

			if (flagCustomerId) {
				return true;
			} else {
				return false;
			}
		},
		/******** END CHECK PAGES ********/

		/******** BEGIN CHECK FIELDS ********/
		/**Begin Sales Data**/
		checkProjectNameBC: function () {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			if (!oGlobalModel.getProperty("/quotationSelected/QuotationName").trim()) {
				return false;
			} else {
				return true;
			}
		},

		checkTitlePoBC: function () {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			if (!oGlobalModel.getProperty("/quotationSelected/Title").trim()) {
				return false;
			} else {
				return true;
			}
		},

		checkQuotationDateBC: function () {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			if (!oGlobalModel.getProperty("/quotationSelected/QuotationDate")) {
				return false;
			} else {
				return true;
			}
		},

		checkQuotationValidBC: function () {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			if (!oGlobalModel.getProperty("/quotationSelected/QuotationValid")) {
				return false;
			} else {
				return true;
			}
		},

		/**End Sales Data**/

		/**Begin Customer Data**/
		checkCustomerIdBC: function () {
			var self = this;
			var oGlobalModel = self.getOwnerComponent().getModel("globalModel");

			if (!oGlobalModel.getProperty("/quotationSelected/CustomerId")) {
				return false;
			} else {
				return true;
			}
		},
		/**End Customer Data**/

		/******** END CHECK FIELDS ********/

	});

});