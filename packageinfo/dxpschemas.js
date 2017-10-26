function getParameter(name) {
	if (!location.search) {
		return '';
	}

	var re = new RegExp('[?&]' + name + '=([^&]*)');
	var m = re.exec(location.search);
	return m ? m[1] : '';
};

var schemaInfoList = null;

var select1 = document.getElementById('sourceVersion');
var select1Value = getParameter('sourceVersion');
var select2 = document.getElementById('targetVersion');
var select2Value = getParameter('targetVersion');
var nameFilter = document.getElementById('nameFilter');
nameFilter.value = getParameter('nameFilter');
var notableOnly = document.getElementById('notableOnly');
notableOnly.checked = getParameter('notableOnly') == 'true';

function isPermaLink(element) {
	return element.getAttribute('data-original-title') == 'Permalink'
};

function checkschemaInfo() {
	if (history.pushState) {
		var baseURL = window.location.protocol + "//" + window.location.host + window.location.pathname;

		if (window.location.pathname == '/share') {
			baseURL = Array.from(document.getElementsByTagName('a')).filter(isPermaLink)[0].href;
		}

		var newURL = baseURL + '?sourceVersion=' + select1.options[select1.selectedIndex].value + '&targetVersion=' + select2.options[select2.selectedIndex].value;

		if (nameFilter.value) {
			newURL += '&nameFilter=' + nameFilter.value;
		}

		if (notableOnly.checked) {
			newURL += '&notableOnly=true';
		}

		history.pushState({path: newURL}, '', newURL);
	}

	var name1 = 'requireSchemaVersion_' + select1.options[select1.selectedIndex].value;
	var header1 = select1.options[select1.selectedIndex].innerHTML;

	var name2 = 'requireSchemaVersion_' + select2.options[select2.selectedIndex].value;
	var header2 = select1.options[select2.selectedIndex].innerHTML;

	var nameFilterValue = nameFilter.value;
	var notableOnlyValue = notableOnly.checked;

	var isDEVersionIncrease = (name2 > name1);

	var isMatchingNameFilter = function(schemaInfo) {
		return (schemaInfo['name'].indexOf(nameFilterValue) != -1) || (schemaInfo['package'].indexOf(nameFilterValue) != -1);
	};

	var isAvailableVersion = function(schemaInfo) {
		var version1 = schemaInfo[name1];
		var version2 = schemaInfo[name2];

		return (version1 != '0.0.0') || (version2 != '0.0.0');
	};

	var isNotableVersionChange = function(schemaInfo) {
		var name = schemaInfo['name'];

		var version1 = schemaInfo[name1];
		var version2 = schemaInfo[name2];

		if ((version1.indexOf('(implicit)') != -1) && (version2.indexOf('(implicit)') != -1)) {
			return false;
		}

		return (version1 != '0.0.0') && (version2 != '0.0.0') && (version1 != version2);
	};

	var summary = document.getElementById('summary');

	var filteredschemaInfoList = schemaInfoList.filter(isMatchingNameFilter).filter(isAvailableVersion);

	if ((name1 != name2) && notableOnlyValue) {
		filteredschemaInfoList = filteredschemaInfoList.filter(isNotableVersionChange);
	}

	summary.innerHTML = '';

	var table = document.createElement('table');
	table.className = 'table';
	summary.appendChild(table);
	var tableBody = document.createElement('tbody');
	table.appendChild(tableBody);
	table = tableBody;

	var getRowBackgroundAlpha = function(version1, version2) {
		return (version1 != version2) ? 0.1 : 0.0;
	};

	var getRowForegroundAlpha = function(version1, version2) {
		return (version1 != version2) ? 0.9 : 0.4;
	};

	var addRow = function(isHeader, rowData) {
		var row = document.createElement('tr');

		if (!isHeader && (rowData.length > 2)) {
			row.style.color = 'rgba(0,0,0,' + getRowForegroundAlpha(rowData[1], rowData[2]) + ')'
			row.style.backgroundColor = 'rgba(0,0,0,' + getRowBackgroundAlpha(rowData[1], rowData[2]) + ')';
		}

		for (var i = 0; i < rowData.length; i++) {
			var cell = document.createElement(isHeader ? 'th' : 'td');
			cell.innerHTML = rowData[i];
			row.appendChild(cell);
		}

		table.appendChild(row);
	};

	if (name1 == name2) {
		addRow(true, ['Bundle Name', header1]);
	}
	else {
		addRow(true, ['Bundle Name', header1, header2]);
	}

	var getRowData = function(schemaInfo) {
		if (name1 == name2) {
			return [schemaInfo['name'], schemaInfo[name1]];
		}
		else {
			return [schemaInfo['name'], schemaInfo[name1], schemaInfo[name2]];
		}
	};

	filteredschemaInfoList.map(getRowData).forEach(addRow.bind(null, false));
};

checkschemaInfo = _.debounce(checkschemaInfo, 100);

var request = new XMLHttpRequest();
var requestURL = 'https://s3-us-west-2.amazonaws.com/mdang.grow/dxpschemas.json';

request.onreadystatechange = function() {
	if (this.readyState == 4 && this.status == 200) {
		schemaInfoList = JSON.parse(this.responseText);

		var prefix = 'requireSchemaVersion_';

		var addFixPack = function(select, x) {
			for (var i = 0; i < select.options.length; i++) {
				if (select.options[i].value == x) {
					return select;
				}
			}

			var option = document.createElement('option');

			option.value = x;
			option.innerHTML = x;
			select.appendChild(option);

			return select;
		};

		var setIndex = function(select, x) {
			for (var i = 0; i < select.options.length; i++) {
				if (select.options[i].value == x) {
					select.selectedIndex = i;
					return;
				}
			}

			select.selectedIndex = select.options.length - 1;
		};

		var fixPackIds = Object.keys(schemaInfoList[0])
			.filter(x => x.indexOf(prefix) == 0)
			.map(x => x.substring(prefix.length));

		fixPackIds.reduce(addFixPack, select1);
		fixPackIds.reduce(addFixPack, select2);

		setIndex(select1, select1Value);
		setIndex(select2, select2Value);

		select1.onchange = checkschemaInfo;
		select2.onchange = checkschemaInfo;
		nameFilter.oninput = checkschemaInfo;
		nameFilter.onpropertychange = checkschemaInfo;
		notableOnly.onchange = checkschemaInfo;

		checkschemaInfo();
	};
};

request.open('GET', requestURL, true);
request.send();