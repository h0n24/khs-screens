const puppeteer = require('puppeteer');
const save = require('./_save');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
      width: 400,
      height: 600
    });
    await page.goto('https://services8.arcgis.com/53ZwuSzWkMambPm6/arcgis/rest/services/Po%C4%8Det_onemocn%C4%9Bn%C3%AD_COVID19_v_Karlovarsk%C3%A9m_kraji/FeatureServer/0/query?where=1%3D1&geometryType=esriGeometryEnvelope&geometryPrecision=6&spatialRel=esriSpatialRelIntersects&outFields=kod%2Cnazev%2CPocetPripadu%2CPocetVylecenych%2CPocetZemrelych%2CPocetObyvatel&resultOffset=0&returnGeometry=false&returnZ=false&returnM=false&returnIdsOnly=false&returnCountOnly=false&returnDistinctValues=false&returnTrueCurves=false&returnExtentsOnly=false&f=pjson', {
      waitUntil: 'networkidle2'
    });

    // printscreen
    await page.evaluate(() => {
      window.scrollBy(0, 1000);
    });

    await page.screenshot({
      path: 'out/03-khskv.png'
    });

    // parsování dat
    const obyvatelstvo = {
      "Karlovy Vary": 114818,
      "Sokolov": 88212,
      "Cheb": 91634
    };

    let data = await page.evaluate(() => {
      return JSON.parse(document.querySelector("body").innerText);
    });

    let preparedData = [];
    
    for (var okres in obyvatelstvo) {
      if (obyvatelstvo.hasOwnProperty(okres)) {
        for (let index = 0; index < data.features.length; index++) {
          const nazev = data.features[index].attributes.nazev;
          const pozitivni = data.features[index].attributes.PocetPripadu;
          const vyleceni = data.features[index].attributes.pocetVylecenych;
          const umrti = data.features[index].attributes.pocetZemrelych;
          const aktivni = pozitivni - vyleceni - umrti;
          const obyvatel = data.features[index].attributes.PocetObyvatel;

          if (okres === nazev) {
            // const obyvatel = obyvatelstvo[okres];
            preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
          }
        }
      }
    }

    save('out/data.json', {
      "03": preparedData
    });

    await browser.close();
  })();
}