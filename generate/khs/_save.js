const fs = require('fs');

module.exports = function (location, data) {
  // nahraje soubor, přečte
  const rawData = fs.readFileSync(location);
  let readData = JSON.parse(rawData);

  // zpracuje data
  let tempDataKey = Object.keys(data);
  let tempData = data[tempDataKey];
  let preparedKey = parseInt(tempDataKey, 10) - 1;

  // přidá data a seřadí
  readData[preparedKey] = tempData;

  // a uloží
  const writeData = JSON.stringify(readData);
  fs.writeFileSync(location, writeData);
}