const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const {
  PdfReader
} = require('pdfreader');

const save = require('./_save');
const report = require('./_report');

const khs = "06-khslbc";

const obyvatelstvo = {
  "Česká Lípa": 103300,
  "Jablonec nad Nisou": 90667,
  "Liberec": 175626,
  "Semily": 74097
};

function addOnlyUnique(jmenoOkresu, pdfDataOkresy) {
  let isSet = false;
  for (const key in pdfDataOkresy) {
    if (pdfDataOkresy.hasOwnProperty(key)) {
      const okres = pdfDataOkresy[key];
      if (jmenoOkresu === okres) {
        isSet = true;
      }
    }
  }
  if (isSet === false) {
    pdfDataOkresy.push(jmenoOkresu);
  }
}

function parsePDFitem(item, pdfData, pdfDataOkresy, pdfFinal) {

  if (item.text === "Onemocnění COVID") {

  } else if (item.text === "19 v LK") {

  } else if (item.text === "-") {

  } else if (item.text === "Česká Lípa") {
    addOnlyUnique("Česká Lípa", pdfDataOkresy);

  } else if (item.text === "Jablonec n/N") {
    addOnlyUnique("Jablonec nad Nisou", pdfDataOkresy);

  } else if (item.text === "Liberec") {
    addOnlyUnique("Liberec", pdfDataOkresy);

  } else if (item.text === "Semily") {
    addOnlyUnique("Semily", pdfDataOkresy);

  } else if (item.text === 'kumulativní počet případů onemocnění dle okresů') {

    const tempData = pdfData.slice(0, 4);
    pdfFinal.push({
      c: tempData
    });
    pdfData.splice(0, 4);

  } else if (item.text === 'počet aktivních případů dle okresů') {

    const tempData = pdfData.slice(0, 4);
    pdfFinal.push({
      a: tempData
    });
    pdfData.splice(0, 4);

  } else if (item.text === 'počet uzdravených osob dle okresů') {

    const tempData = pdfData.slice(0, 4);
    pdfFinal.push({
      h: tempData
    });
    pdfData.splice(0, 4);

  } else {

    // je třeba přeskočit všechna data ze spodní části pdf, 
    // protože tam se objevuje "aktualizováno v" 
    if (item.y < 33) {
      pdfData.push(item.text);
    }
  }
}

function parsePDFafter(pdfData, pdfDataOkresy, pdfFinal, preparedData) {
  // ve zbytku pdfData lze nalézt poslední datum aktualizace
  console.log(pdfData);

  for (let index = 0; index < pdfDataOkresy.length; index++) {
    const okres = pdfDataOkresy[index];
    const obyvatel = obyvatelstvo[okres];

    let pozitivni = null;
    let vyleceni = null;
    let aktivni = null;

    for (const key in pdfFinal) {
      if (pdfFinal.hasOwnProperty(key)) {
        const element = pdfFinal[key];
        const [category] = Object.keys(element);

        if (category === 'c') {
          pozitivni = element[category][index];
          pozitivni = parseInt(pozitivni, 10);
        }
        if (category === 'h') {
          vyleceni = element[category][index];
          vyleceni = parseInt(vyleceni, 10);
        }
        if (category === 'a') {
          aktivni = element[category][index];
          aktivni = parseInt(aktivni, 10);
        }
      }
    }

    let umrti = null;
    if (Number.isInteger(pozitivni) && Number.isInteger(aktivni) && Number.isInteger(vyleceni)) {
      umrti = pozitivni - aktivni - vyleceni;
    }

    preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
  }

  // finálně uloží data do souboru
  saveToFile(preparedData);

  report(khs, "OK");
}

function saveToFile(data) {
  save('out/data.json', {
    "06": data
  });
}

function parsePDF(PDFfilePath, pdfData, pdfDataOkresy, pdfFinal, preparedData) {
  new PdfReader().parseFileItems(PDFfilePath, function (err, item) {
    if (err) {
      console.error(err);
    } else if (!item) {
      /* pdfreader queues up the items in the PDF and passes them to
       * the callback. When no item is passed, it's indicating that
       * we're done reading the PDF. */
      // console.log('Done.');
      parsePDFafter(pdfData, pdfDataOkresy, pdfFinal, preparedData);
    } else if (item.file) {
      // File items only reference the PDF's file path.
      // console.log(`Parsing ${item.file && item.file.path || 'a buffer'}`)
    } else if (item.page) {
      // Page items simply contain their page number.
      // console.log(`Reached page ${item.page}`);
    } else if (item.text) {
      // Goes through every item in the pdf file
      parsePDFitem(item, pdfData, pdfDataOkresy, pdfFinal);
    }
  });
}

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    let pdfData = [];
    let pdfDataOkresy = [];
    let pdfFinal = [];
    let preparedData = [];

    const checkFileExists = false;

    // screenshot --------------------------------------------------------------
    const SCRfilePath = `out/${khs}.png`;

    // pokud již soubor existuje, nestahovat znovu, zrychluje proces
    if (checkFileExists && fs.existsSync(SCRfilePath)) {
      report(khs, "Screenshot byl nalezen, přeskakuji stahování");
    } else {
      await page.setViewport({
        width: 510,
        height: 1850
      });

      await page.goto('http://www.khslbc.cz/', {
        waitUntil: 'networkidle2'
      });

      await page.evaluate(() => {
        window.scrollBy(240, 1350);
      });

      await page.screenshot({
        path: 'out/06-khslbc.png'
      });
    }

    // Vyhledání pdf souboru (url se každý den mění) ---------------------------
    const PDFfilePath = `out/${khs}.pdf`;
    const urlWithPDF = 'https://www.khslbc.cz/khs_informace_covid-19/';

    // pokud již soubor existuje, nestahovat znovu, 
    // zrychluje proces, šetří KHS weby
    if (checkFileExists && fs.existsSync(PDFfilePath)) {
      report(khs, "PDF soubor byl nalezen, přeskakuji stahování");
      parsePDF(PDFfilePath, pdfData, pdfDataOkresy, pdfFinal, preparedData);

    } else {

      // přístup na stránku
      const page2 = await browser.newPage();
      await page2.goto(urlWithPDF, {
        waitUntil: 'networkidle2'
      });

      // hledání url s pdf (každý den se URL mění)
      const url = await page2.evaluate(() => {
        let names = document.querySelectorAll('.mtli_pdf');
        let arr = Array.prototype.slice.call(names);
        for (let i = 0; i < arr.length; i += 1) {

          if (arr[i].innerHTML.includes('Onemocnění COVID-19 v LK dle okresů')) {
            return arr[i].href;
          }
        }
      });

      // hledání data aktualizace
      const crawledTime = await page2.evaluate(() => {
        let spans = document.querySelectorAll("span[style='font-size: 10pt;']");
        let arr = Array.prototype.slice.call(spans);
        for (let i = 0; i < arr.length; i += 1) {

          if (arr[i].innerText.includes('Aktualizace')) {
            return arr[i].innerText;
          }
        }
      });

      // čištění času
      // ukázka dat: Stav k 16.8.2020 - 18:15
      // odstranění všeho kromě čísel, tečky, čárky a dvojtečky
      let [date, time] = crawledTime.split("v ");
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
      dateTime = `${tempDate} ${time}`;
      let ISODate = new Date(dateTime).toISOString();

      save('out/time.json', {
        "06": ISODate
      });

      // ukládání pdf a parsování pdf --------------------------------------------
      const file = fs.createWriteStream(PDFfilePath);
      const request = https.get(url, function (response) {
        response.pipe(file);

        // After all the data is saved
        response.on('end', function () {
          parsePDF(PDFfilePath, pdfData, pdfDataOkresy, pdfFinal, preparedData);
        });
      });
    }

    await browser.close();
  })();
}
