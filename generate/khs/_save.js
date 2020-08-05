const fs = require('fs');

module.exports = function (location, data) {
  // nahraje soubor, přečte
  const rawData = fs.readFileSync(location);
  let readData = JSON.parse(rawData);

  // přidá data a uloží
  readData.push(data);
  const writeData = JSON.stringify(readData);
  fs.writeFileSync(location, writeData);
}