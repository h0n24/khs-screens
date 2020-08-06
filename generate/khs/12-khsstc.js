const puppeteer = require('puppeteer');
const save = require('./_save');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
      width: 400,
      height: 1900
    });
    await page.goto('https://services7.arcgis.com/6U6Ps5FLizN0Qujz/ArcGIS/rest/services/Po%C4%8Det_onemocn%C4%9Bn%C3%AD_COVID19_ve_St%C5%99edo%C4%8Desk%C3%A9m_kraji/FeatureServer/0/query?where=1%3D1&geometryType=esriGeometryEnvelope&geometryPrecision=6&spatialRel=esriSpatialRelIntersects&outFields=kod%2Cnazev%2CPocetPripadu%2CPocetVylecenych%2CPocetZemrelych%2CPocetObyvatel&resultOffset=0&returnGeometry=false&returnZ=false&returnM=false&returnIdsOnly=false&returnCountOnly=false&returnDistinctValues=false&returnTrueCurves=false&returnExtentsOnly=false&f=pjson', {
      waitUntil: 'networkidle2'
    });

    await page.evaluate(() => {
      window.scrollBy(0, 920);
    });

    await page.screenshot({
      path: 'out/12-khsstc.png'
    });


    const obyvatelstvo = {
      "Rakovník": 55562,
      "Kladno": 166483,
      "Mělník": 109302,
      "Mladá Boleslav": 130365,
      "Nymburk": 100886,
      "Kolín": 102623,
      "Kutná Hora": 75828,
      "Benešov": 99414,
      "Příbram": 115104,
      "Beroun": 95058,
      "Praha-západ": 149338,
      "Praha-východ": 185178
    };

    let data = await page.evaluate(() => {
      return JSON.parse(document.querySelector("body").innerText);
    });

    let preparedData = [];

    for (let index = 0; index < data.features.length; index++) {
      const nazev = data.features[index].attributes.nazev;
      const pozitivni = data.features[index].attributes.PocetPripadu;
      const vyleceni = data.features[index].attributes.pocetVylecenych;
      const umrti = data.features[index].attributes.pocetZemrelych;
      const aktivni = pozitivni - vyleceni - umrti;
      const obyvatel = data.features[index].attributes.PocetObyvatel;

      for (var okres in obyvatelstvo) {
        if (obyvatelstvo.hasOwnProperty(okres)) {

          if (okres === nazev) {
            // const obyvatel = obyvatelstvo[okres];
            preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
          }
        }
      }
    }

    save('out/data.json', {
      "12": preparedData
    });

    await browser.close();
  })();
}