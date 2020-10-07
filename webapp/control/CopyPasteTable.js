sap.ui.define([
	"sap/ui/table/Table"
], function (Table) {
	return Table.extend("zotc_easyquote.zotc_easyquote.CopyPasteTable", {
		onInit: function () {

		},
		insertRows: function (value, table, model, startRowIndex, startProperty) {

			// var that = this;
			// var rows = value.split(/\n/);
			// var cells = table.getBindingInfo('items').template.getCells();
			// var templateItem = [];
			// var itemsPath = table.getBindingPath('items');
			// var itemsArray = table.getModel(model).getProperty(itemsPath);
			// var startPropertyIndex = 0;
			// var model = table.getModel(model);

			var that = this;
			var rows = value.split(/\n/);
			var cells = table.getAggregation('rows');
			var templateItem = [];
			var itemsPath = table.getBindingPath('rows');
			var itemsArray = table.getModel("customSearchArea").getProperty(itemsPath);
			var startPropertyIndex = 0;
			var model = table.getModel("customSearchArea");
			if (startRowIndex === undefined) {
				startRowIndex = 0;
			}
			for (var int = 0; int < cells.length; int++) {
				var cell_element = cells[int];
				var path = cell_element.getBindingPath('value');
				templateItem.push(path);
				if (path === startProperty) {
					startPropertyIndex = int;
				}

			}

			for (var int = 0; int < rows.length - 1; int++) {
				var rows_element = rows[int];
				var cells = rows_element.split(/\t/);

				var originalObject = model.getProperty(itemsPath + "/" + startRowIndex++);
				if (originalObject === undefined) {
					originalObject = {};
					for (var k = 0; k < templateItem.length; k++) {
						originalObject[templateItem[k]] = undefined;
					}
					itemsArray.push(originalObject);
				}

				var lesserLength = Math.min(templateItem.length, (cells.length + startPropertyIndex));
				for (var int2 = startPropertyIndex, intValue = 0; int2 < lesserLength; int2++, intValue++) {
					var name = templateItem[int2];
					originalObject[name] = cells[intValue];

				}

			}
			if (rows.length === 1) {

				model.getData()[startRowIndex][startProperty] = value;

			}
			model.refresh();

		},
		onAfterRendering: function () {
			var that = this;
			sap.ui.table.Table.prototype.onAfterRendering.apply(this, arguments);
			this.attachBrowserEvent('paste', function (e) {
				e.preventDefault();
				var text = (e.originalEvent || e).clipboardData.getData('text/plain');
				console.log(text);
				that.insertRows(text, this, undefined);
			});
			// this.getAggregation('items').forEach(function (row) {
			// 	row.getCells().forEach(function (cell) {
			// 		cell.attachBrowserEvent('paste', function (e) {
			// 			e.stopPropagation();

			// 			e.preventDefault();
			// 			var text = (e.originalEvent || e).clipboardData.getData('text/plain');
			// 			console.log(text);
			// 			var domCell = jQuery.sap.domById(e.currentTarget.id)
			// 			var insertCell = jQuery('#' + domCell.id).control()[0];
			// 			var itemsPath = that.getBindingPath('items');
			// 			var pathRow = insertCell.getBindingContext().sPath;
			// 			var startRowIndex = pathRow.split(itemsPath + "/")[1];
			// 			var startProperty = insertCell.getBindingPath('value');
			// 			that.insertRows(text, that, undefined, startRowIndex, startProperty);
			// 		});
			// 	});
			// });

			this.getAggregation('rows').forEach(function (row) {
				row.getCells().forEach(function (cell) {
					cell.attachBrowserEvent('paste', function (e) {
						e.stopPropagation();

						e.preventDefault();
						var text = (e.originalEvent || e).clipboardData.getData('text/plain');
						console.log(text);
						var domCell = jQuery.sap.domById(e.currentTarget.id)
						var insertCell = jQuery('#' + domCell.id).control()[0];
						var itemsPath = that.getBindingPath('rows');
						var pathRow = insertCell.getParent().oBindingContexts.customSearchArea.sPath;
						var pattern = new RegExp("/(.*)");

						var startRowIndex = pattern.exec(pathRow);
						
						var startProperty = insertCell.getBindingPath('value');
						that.insertRows(text, that, undefined, startRowIndex[1], startProperty);
					});
				});
			});

		},
		renderer: sap.ui.table.Table.prototype.getRenderer()

	});
});