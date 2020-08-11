const puppeteer = require('puppeteer');
const fs = require('fs');

function save(location, data) {
  // nahraje soubor, přečte
  const rawData = fs.readFileSync(location);
  let readData = JSON.parse(rawData);

  // console.log("save", readData);

  // // zpracuje data
  // let tempDataKey = Object.keys(data);
  // let tempData = data[tempDataKey];
  // let preparedKey = parseInt(tempDataKey, 10) - 1;

  // // přidá data a seřadí
  // readData[preparedKey] = tempData;



  if (Array.isArray(readData) && readData.length === 0) {
    readData = data;
  } else {
    for (const den in readData) {
      if (readData.hasOwnProperty(den)) {
        const element = readData[den];
        const okres = Object.keys(element)[0];
        const okresData = element[okres];
        
        // console.log(element, okres, okresData);

        if (readData[den][okres] === undefined) {
          readData[den][okres] = {}
        }

        // console.log("datakey", data[den]);

        readData[den] = data[den];
      }
    }
  }

  

  // a uloží
  const writeData = JSON.stringify(readData);

  // console.log("--",readData);

  fs.writeFileSync(location, writeData);
}

function getOkresData(embedUrl, parsedData) {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(embedUrl, {
      waitUntil: 'networkidle2'
    });

    // příklad pro crawledColumnData
    // { label: 'datum',
    // value:
    //  [ 'Benešov — zesnulí',
    //    'Benešov — uzdravení',
    //    'Benešov — potvrzené případy' ] }

    const crawledColumnData = await page.evaluate(() => {
      return _Flourish_data_column_names.data;
    });

    let okres;
    [okres, ] = crawledColumnData.value;
    [okres, ] = okres.split(" — ");

    // crawlování dat
    const crawledData = await page.evaluate(() => {
      return _Flourish_data.data;
    });

    for (const key in crawledData) {
      if (crawledData.hasOwnProperty(key)) {
        const element = crawledData[key];

        // originál např: 04.08.
        let datumISO = element.label;
        let [den, mesic, ] = datumISO.split(".");
        datumISO = `2020-${mesic}-${den}`;

        let [zesnuli, uzdraveni, nemocni] = element.value;

        zesnuli = parseInt(zesnuli, 10);
        uzdraveni = parseInt(uzdraveni, 10);
        nemocni = parseInt(nemocni, 10);

        if (uzdraveni === NaN) {
          uzdraveni = null;
        }

        if (nemocni === NaN) {
          nemocni = null;
        }

        let aktivni = null;
        if (zesnuli !== null && uzdraveni !== null && nemocni !== null) {
          aktivni = nemocni - uzdraveni - zesnuli;
        }

        if (parsedData[datumISO] === undefined) {
          parsedData[datumISO] = {}
        }

        if (parsedData[datumISO][okres] === undefined) {
          parsedData[datumISO][okres] = {}
        }

        parsedData[datumISO][okres] = {
          c: nemocni,
          h: uzdraveni,
          d: zesnuli,
          a: aktivni
        };
      }
    }

    save('./old-data.json', parsedData);

    await browser.close();
  })();
}

// inicializace ----------------------------------------------------------------

(async () => {

  // prvotní smazání souboru
  fs.writeFileSync('old-data.json', "[]");

  // proměnné
  let parsedData = {};

  // puppeteer crawl
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const baseUrl = "https://flo.uri.sh/visualisation/2286726/embed";
  await page.goto(baseUrl, {
    waitUntil: 'networkidle2'
  });

  const crawledData = await page.evaluate(() => {
    return _Flourish_data.choropleth;
  });

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };

  for (const key in crawledData) {
    if (crawledData.hasOwnProperty(key)) {
      const metadata = crawledData[key].metadata;
      const okres = metadata[9];
      let embedHtml = metadata[10];

      var [, embedUrl] = embedHtml.match(/src\s*=\s*'(.+?)'/);

      // limit - používá se pro testování, max je kolem 80
      if (key < 100){
        await sleep(1000); // ať nepřetěžujeme servery
        getOkresData(embedUrl, parsedData);
        console.log(okres, embedUrl, key);
      }
    }
  }
  

  // let testUrl = "https://flo.uri.sh/visualisation/2281059/embed";
  // // testUrl = "https://flo.uri.sh/visualisation/2281078/embed";
  // getOkresData(testUrl, parsedData);

  await browser.close();
})();