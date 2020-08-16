const puppeteer = require('puppeteer');
const fs = require('fs');

const save = require('./_save');
const report = require('./_report');

const khs = "03-khskv";

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();

    // stažení dat -------------------------------------------------------------
    const page = await browser.newPage();

    await page.goto('https://services8.arcgis.com/53ZwuSzWkMambPm6/arcgis/rest/services/Po%C4%8Det_onemocn%C4%9Bn%C3%AD_COVID19_v_Karlovarsk%C3%A9m_kraji/FeatureServer/0/query?where=1%3D1&geometryType=esriGeometryEnvelope&geometryPrecision=6&spatialRel=esriSpatialRelIntersects&outFields=kod%2Cnazev%2CPocetPripadu%2CPocetVylecenych%2CPocetZemrelych%2CPocetObyvatel&resultOffset=0&returnGeometry=false&returnZ=false&returnM=false&returnIdsOnly=false&returnCountOnly=false&returnDistinctValues=false&returnTrueCurves=false&returnExtentsOnly=false&f=pjson', {
      waitUntil: 'networkidle2'
    });

    // příprava dat
    const obyvatelstvo = {
      "Karlovy Vary": 114818,
      "Sokolov": 88212,
      "Cheb": 91634
    };

    // parsování dat
    let data = await page.evaluate(() => {
      return JSON.parse(document.querySelector("body").innerText);
    });

    // uložení jako json
    const stringData = JSON.stringify(data);
    const writeStream = fs.createWriteStream(`out/${khs}.json`);
    writeStream.write(stringData);

    // čištění dat
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

    // stažení infa o posledním update -----------------------------------------

    const page2 = await browser.newPage();

    await page2.goto('https://services8.arcgis.com/53ZwuSzWkMambPm6/ArcGIS/rest/services/Po%C4%8Det_onemocn%C4%9Bn%C3%AD_COVID19_v_Karlovarsk%C3%A9m_kraji/FeatureServer/0?f=pjson', {
      waitUntil: 'networkidle2'
    });

    // parsování dat
    let dataTime = await page2.evaluate(() => {
      return JSON.parse(document.querySelector("body").innerText);
    });

    const unixTime = dataTime.editingInfo.lastEditDate; //unixtime in ms
    const ISODate = new Date(unixTime).toISOString();

    save('out/time.json', {
      "03": ISODate
    });

    // finalizace  -------------------------------------------------------------
    report(khs, "OK");

    await browser.close();
  })();
}