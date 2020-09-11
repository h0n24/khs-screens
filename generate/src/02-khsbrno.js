const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const {
  PdfReader
} = require('pdfreader');

const save = require('./_save');
const clean = require('./_clean');
const report = require('./_report');

const khs = "02-khsbrno";

module.exports = new Promise((resolve, reject) => {
  (async () => {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // přístup na stránku
    await page.goto('https://www.khsbrno.cz/', {
      waitUntil: 'networkidle2'
    });

    // hledání posledního pdf
    const url = await page.evaluate(() => {
      let names = document.querySelectorAll('.zvyrazneni_radku');
      let arr = Array.prototype.slice.call(names);
      for (let i = 0; i < arr.length; i += 1) {

        let link = arr[i].querySelector("a");

        // možné modifikace odkazů:
        // Aktuální epid. situace v Jihomoravském kraji - COVID-19
        // Aktuální epidemiologická situace v Jihomoravském kraji - COVID-19
        // COVID-19, Jihomoravský kraj
        if (link.innerHTML.includes('COVID-19')) {
          return link.href;
        }
      }
    });

    // stahování pdf
    if (url) {
      const file = fs.createWriteStream("out/02-khsbrno.pdf");
      const request = https.get(url, function (response) {
        response.pipe(file);
      });

      file.on('finish', function () {
        // console.log("finished");
        onPdfSavedToDisk();
      });
    }

    // čtení pdf
    function onPdfSavedToDisk() {
      let okresY = [];
      let osaX = [];
      let pdfData = new Array(7);
      let pdfDataTime = "";
      let unique = [true, true, true, true, true, true, true];

      function pdfParsePrepareYAxis(item) {

        function findOnlyUniqueRow(id) {
          if (unique[id] !== false) {
            okresY[id] = item.y;
          }
          unique[id] = false;
        }

        if (item.text === "Brno-město") {
          findOnlyUniqueRow(0);
        }

        if (item.text === "Brno-venkov") {
          findOnlyUniqueRow(1);
        }

        if (item.text === "Blansko") {
          findOnlyUniqueRow(2);
        }

        if (item.text === "Břeclav") {
          findOnlyUniqueRow(3);
        }

        if (item.text === "Hodonín") {
          findOnlyUniqueRow(4);
        }

        if (item.text === "Vyškov") {
          findOnlyUniqueRow(5);
        }

        if (item.text === "Znojmo") {
          findOnlyUniqueRow(6);
        }
      }

      function pdfParse(item) {

        // ukládání veškerého textu do stringu pro účely získání data
        pdfDataTime = pdfDataTime + item.text;

        // získání pozice X a Y
        pdfParsePrepareYAxis(item);

        // popis osy x
        if (item.y === okresY[0]) {
          osaX.push(Math.round(item.x));
        }

        for (let index = 0; index < okresY.length; index++) {
          const osaY = okresY[index];
          if (item.y === osaY) {
            // console.log(item);

            if (pdfData[index] === undefined) {
              pdfData[index] = [];
            }

            // musíme nalézt pozici vůči tabulky (sloupec)
            let poziceX;
            for (let indexX = 0; indexX < osaX.length; indexX++) {
              const tempX = osaX[indexX];
              const tempItemX = Math.round(item.x);

              // bohužel se nedají porovnávat přímo, někdy jsou menší či větší
              if (tempX === tempItemX) {
                poziceX = indexX;
              } else if (tempX === tempItemX + 1) {
                poziceX = indexX;
              } else if (tempX === tempItemX - 1) {
                poziceX = indexX;
              }
            }

            // testing purposes only: Math.round(item.x)
            pdfData[index].push([poziceX, item.text]);
          }
        }
      }

      function afterPdfParse(pdfData) {
        // zpracování dat
        const obyvatelstvo = {
          "Brno-město": 381346,
          "Brno-venkov": 224642,
          "Blansko": 109136,
          "Břeclav": 116291,
          "Hodonín": 153943,
          "Vyškov": 92280,
          "Znojmo": 114351
        };

        let preparedData = [];

        for (let index = 0; index < pdfData.length; index++) {
          const rowData = pdfData[index];
          const okres = rowData[0][1];
          const pozitivni = clean.number(rowData[1][1]);
          const vyleceni = clean.number(rowData[2][1]);
          const obyvatel = obyvatelstvo[okres];

          let umrti = 0;
          if (rowData[3][0] === 3) {
            umrti = clean.number(rowData[3][1]);
          }

          let aktivni = null;
          if (rowData[rowData.length - 1][0] === 6) {
            aktivni = clean.number(rowData[rowData.length - 1][1]);
          }

          preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
        }

        save('out/data.json', {
          "02": preparedData
        });

        // zpracování času
        // je třeba vyhledat v celém textu (pozice x,y se mění)
        let [,tempTime] = pdfDataTime.split("Přehled situace");
        [tempTime,] = tempTime.split("Kumulativní počty");

        // ukázka dat:
        // vJihomoravském krajize dne 14. srpna 2020, 17:00 hod.
        
        // přepsání měsíce z textu na číslo
        tempTime = tempTime.replace("ledna","1.");
        tempTime = tempTime.replace("února","2.");
        tempTime = tempTime.replace("března","3.");
        tempTime = tempTime.replace("dubna","4.");
        tempTime = tempTime.replace("května","5.");
        tempTime = tempTime.replace("června","6.");
        tempTime = tempTime.replace("července","7.");
        tempTime = tempTime.replace("srpna","8.");
        tempTime = tempTime.replace("září","9.");
        tempTime = tempTime.replace("října","10.");
        tempTime = tempTime.replace("listopadu","11.");
        tempTime = tempTime.replace("prosince","12.");

        // odstraní // a všechny duplikované mezery
        tempTime = tempTime.replace(/\s+/g,' ');

        // dne <datum>, <čas>
        // ale bývá i dni
        if (tempTime.includes("dne")) {
          [,tempTime] = tempTime.split("dne");
        }

        if (tempTime.includes("dni")) {
          [,tempTime] = tempTime.split("dni");
        }
        let [date, time] = tempTime.split(",");

        date = date.replace(/[^0-9.]/g, "");
        time = time.replace(/[^0-9:]/g, "");
    
        let [den, mesic, rok] = date.split(".");
    
        den = den.replace(".", "");
        mesic = mesic.replace(".", "");
    
        den = parseInt(den, 10);
        mesic = parseInt(mesic, 10);
        rok = parseInt(rok, 10);
    
        mesic < 9 ? mesic = `0${mesic}` : mesic;
        den < 9 ? den = `0${den}` : den;
    
        const tempDate = `${rok}-${mesic}-${den}`;
        const dateTime = `${tempDate} ${time}`;

        let ISODate = new Date(dateTime).toISOString();
    
        save('out/time.json', {
          "02": ISODate
        });

        // finální report
        report(khs, "OK");

        resolve();
      }

      new PdfReader().parseFileItems("out/02-khsbrno.pdf", function (err, item) {
        if (err) {
          console.error(err);
        } else if (!item) {
          /* pdfreader queues up the items in the PDF and passes them to
           * the callback. When no item is passed, it's indicating that
           * we're done reading the PDF. */
          // console.log('Done.');
          afterPdfParse(pdfData);
        } else if (item.file) {
          // File items only reference the PDF's file path.
          // console.log(`Parsing ${item.file && item.file.path || 'a buffer'}`)
        } else if (item.page) {
          // Page items simply contain their page number.
          // console.log(`Reached page ${item.page}`);
        } else if (item.text) {
          // Goes through every item in the pdf file
          pdfParse(item);
        }
      });
    }

    await browser.close();
  })();
});