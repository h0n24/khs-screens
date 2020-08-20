const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// -----------------------------------------------------------------------------
// Příprava dat

const https = require('https');

https.get('https://onemocneni-aktualne.mzcr.cz/api/v2/covid-19/kraj-okres-nakazeni-vyleceni-umrti.json', (resp) => {
  let data = '';

  // A chunk of data has been recieved.
  resp.on('data', (chunk) => {
    data += chunk;
  });

  // The whole response has been received. Print out the result.
  resp.on('end', () => {
    let prepData = JSON.parse(data);
    parseData(prepData);
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});

const okresyLAUkod = {
  "CZ0100": "Praha",
  "CZ0201": "Benešov",
  "CZ0202": "Beroun",
  "CZ0203": "Kladno",
  "CZ0204": "Kolín",
  "CZ0205": "Kutná Hora",
  "CZ0206": "Mělník",
  "CZ0207": "Mladá Boleslav",
  "CZ0208": "Nymburk",
  "CZ0209": "Praha-východ",
  "CZ020A": "Praha-západ",
  "CZ020B": "Příbram",
  "CZ020C": "Rakovník",
  "CZ0311": "České Budějovice",
  "CZ0312": "Český Krumlov",
  "CZ0313": "Jindřichův Hradec",
  "CZ0314": "Písek",
  "CZ0315": "Prachatice",
  "CZ0316": "Strakonice",
  "CZ0317": "Tábor",
  "CZ0321": "Domažlice",
  "CZ0322": "Klatovy",
  "CZ0323": "Plzeň-město",
  "CZ0324": "Plzeň-jih",
  "CZ0325": "Plzeň-sever",
  "CZ0326": "Rokycany",
  "CZ0327": "Tachov",
  "CZ0411": "Cheb",
  "CZ0412": "Karlovy Vary",
  "CZ0413": "Sokolov",
  "CZ0421": "Děčín",
  "CZ0422": "Chomutov",
  "CZ0423": "Litoměřice",
  "CZ0424": "Louny",
  "CZ0425": "Most",
  "CZ0426": "Teplice",
  "CZ0427": "Ústí nad Labem",
  "CZ0511": "Česká Lípa",
  "CZ0512": "Jablonec nad Nisou",
  "CZ0513": "Liberec",
  "CZ0514": "Semily",
  "CZ0521": "Hradec Králové",
  "CZ0522": "Jičín",
  "CZ0523": "Náchod",
  "CZ0524": "Rychnov nad Kněžnou",
  "CZ0525": "Trutnov",
  "CZ0531": "Chrudim",
  "CZ0532": "Pardubice",
  "CZ0533": "Svitavy",
  "CZ0534": "Ústí nad Orlicí",
  "CZ0631": "Havlíčkův Brod",
  "CZ0632": "Jihlava",
  "CZ0633": "Pelhřimov",
  "CZ0634": "Třebíč",
  "CZ0635": "Žďár nad Sázavou",
  "CZ0641": "Blansko",
  "CZ0642": "Brno-město",
  "CZ0643": "Brno-venkov",
  "CZ0644": "Břeclav",
  "CZ0645": "Hodonín",
  "CZ0646": "Vyškov",
  "CZ0647": "Znojmo",
  "CZ0711": "Jeseník",
  "CZ0712": "Olomouc",
  "CZ0713": "Prostějov",
  "CZ0714": "Přerov",
  "CZ0715": "Šumperk",
  "CZ0721": "Kroměříž",
  "CZ0722": "Uherské Hradiště",
  "CZ0723": "Vsetín",
  "CZ0724": "Zlín",
  "CZ0801": "Bruntál",
  "CZ0802": "Frýdek-Místek",
  "CZ0803": "Karviná",
  "CZ0804": "Nový Jičín",
  "CZ0805": "Opava",
  "CZ0806": "Ostrava"
};

const okresyDocs = ["České Budějovice","Český Krumlov","Jindřichův Hradec","Písek","Prachatice","Strakonice","Tábor","Brno-město","Brno-venkov","Blansko","Břeclav","Hodonín","Vyškov","Znojmo","Karlovy Vary","Sokolov","Cheb","Jihlava","Havlíčkův Brod","Pelhřimov","Třebíč","Žďár nad Sázavou","Hradec Králové","Jičín","Náchod","Rychnov nad Kněžnou","Trutnov","Česká Lípa","Jablonec nad Nisou","Liberec","Semily","Bruntál","Opava","Nový Jičín","Ostrava","Karviná","Frýdek-Místek","Olomouc","Prostějov","Přerov","Šumperk","Jeseník","Pardubice","Chrudim","Svitavy","Ústí nad Orlicí","Tachov","Plzeň-sever","Plzeň-město","Rokycany","Plzeň-jih","Domažlice","Klatovy","Praha","Rakovník","Kladno","Mělník","Mladá Boleslav","Nymburk","Kolín","Kutná Hora","Benešov","Příbram","Beroun","Praha-západ","Praha-východ","Děčín","Chomutov","Most","Litoměřice","Louny","Teplice","Ústí nad Labem","Kroměříž","Uherské Hradiště","Vsetín","Zlín"]

// test jestli jsou všechny stejně pojmenované
// for (const key in okresyLAUkod) {
//   if (okresyLAUkod.hasOwnProperty(key)) {
//     const okres = okresyLAUkod[key];

//     let test = false;
//     for (let index = 0; index < okresyDocs.length; index++) {
//       const okresTest = okresyDocs[index];
//       if (okresTest === okres) {
//         test = true;
//       }
//     }
//     if (test === false) {
//       console.log(okres);
//     }
//   }
// }

function findOkres(LAUkod) {
  for (const key in okresyLAUkod) {
    if (okresyLAUkod.hasOwnProperty(key)) {
      const okres = okresyLAUkod[key];
      if (LAUkod === key) {
        return okres;
      }
    }
  }
}

function parseData(data) {
  const lastUpdate = data.modified;
  const tempData = data.data;
  let preparedData = [];

  for (const key in tempData) {
    if (tempData.hasOwnProperty(key)) {
      const element = tempData[key];
      const LAUkod = element.okres_lau_kod;
      const datum = element.datum;

      // redukce na dané datum
      // if (element.datum === "2020-08-05" || element.datum === "2020-08-06" || element.datum === "2020-08-07") {

        if (preparedData[datum] === undefined) {
          preparedData[datum] = [];
        }

        const okres = findOkres(LAUkod);
        const nakazeni = element.kumulativni_pocet_nakazenych;
        const vyleceni = element.kumulativni_pocet_vylecenych;
        const umrti = element.kumulativni_pocet_umrti;
        const aktivni = nakazeni - vyleceni - umrti;

        // console.log(okres, nakazeni, vyleceni, umrti);
        // console.log(okres, aktivni);

        preparedData[datum][okres] = [nakazeni, vyleceni, umrti, aktivni];
      // }
    }
  }

  sortData(preparedData);
}

function sortData(data) {
  let preparedData = {};

  for (const datum in data) {
    if (data.hasOwnProperty(datum)) {
      const den = data[datum];
      preparedData[datum] = {};

      for (let index = 0; index < okresyDocs.length; index++) {
        const okresDocs = okresyDocs[index];

        for (const okresData in den) {
          if (den.hasOwnProperty(okresData)) {
            const tempOkres = den[okresData];
            if (okresData === okresDocs) {
              preparedData[datum][okresDocs] = tempOkres;
            }
          }
        }
      }
    }
  }
  
  // příprava dat
  prepareData(preparedData);

  // uložení do minifikovaného jsonu
  saveJson(preparedData);

  // console.log(preparedData);
  // příprava k autentifikaci a na upload na Gdocs
  startAuth();
}

function saveJson(data) {
  const writeData = JSON.stringify(data);
  fs.writeFileSync("out/ofi-api.min.json", writeData);
}

// -----------------------------------------------------------------------------

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

function startAuth() {

  // Load client secrets from a local file.
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    // console.log("autorizace");
    authorize(JSON.parse(content), uploadData);
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}


// zápis crawlovaných dat ------------------
// let values = [
//   [
//     timeString, dateShort
//   ],
//   // Additional rows ...
// ];

// model dat:
// okres, pozitivni, vyleceni, umrti, aktivni, obyvatel
// potřebujeme -> bez okresu

let docsNakazeni = [];
let docsVyleceni = [];
let docsUmrti = [];
let docsAktivni = [];

function prepareArray(array, rowIndex, denIndex, denISO) {
  if (array[rowIndex] === undefined) {
    array[rowIndex] = [];
  }
  if (array[rowIndex][denIndex] === undefined) {
    array[rowIndex][denIndex] = [];
  }
  array[rowIndex][denIndex] = denISO;
}

function prepareData(data) {
  for (const denISO in data) {
    if (data.hasOwnProperty(denISO)) {
      const dataDen = data[denISO];
      const denIndex = Object.keys(data).indexOf(denISO);

      let rowIndex = 0;

      prepareArray(docsNakazeni, rowIndex, denIndex, denISO);
      prepareArray(docsVyleceni, rowIndex, denIndex, denISO);
      prepareArray(docsUmrti, rowIndex, denIndex, denISO);
      prepareArray(docsAktivni, rowIndex, denIndex, denISO);

      for (const okres in dataDen) {
        if (dataDen.hasOwnProperty(okres)) {
          rowIndex = rowIndex + 1;

          const okresData = dataDen[okres];
          const [nakazeni, vyleceni, umrti, aktivni] = okresData;
          // console.log(nakazeni, vyleceni, umrti, aktivni);

          prepareArray(docsNakazeni, rowIndex, denIndex, nakazeni);
          prepareArray(docsVyleceni, rowIndex, denIndex, vyleceni);
          prepareArray(docsUmrti, rowIndex, denIndex, umrti);
          prepareArray(docsAktivni, rowIndex, denIndex, aktivni);
        }
      }

      rowIndex = rowIndex + 1;
    }
  }

  // console.log(docsNakazeni);
}

// --------------------------------------
// samotná práce s daty na Google Docs

const spreadsheetId = '1FFEDhS6VMWon_AWkJrf8j3XxjZ4J6UI1B2lO3IW-EEc';

/**
 * Gets the data from Spreadsheet
 * @see https://docs.google.com/spreadsheets/d/1FFEDhS6VMWon_AWkJrf8j3XxjZ4J6UI1B2lO3IW-EEc/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function uploadData(auth) {

  const sheets = google.sheets({version: 'v4', auth});


  // list crawl dnes ----------------------------------------------------------

  // zápis crawlovaných dat ------------------
  // let values = [
  //   [
  //     timeString, dateShort
  //   ],
  //   // Additional rows ...
  // ];
  const dataCrawlNakazeni = [{
    range: 'Ofi: nakazeni!C1:ZZ78',
    values: docsNakazeni,
  }];
  // Additional ranges to update ...
  let resourceCrawlNakazeni = {
    data: dataCrawlNakazeni,
    valueInputOption: "RAW",
  };
  sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: resourceCrawlNakazeni,
  }, (err, result) => {
    if (err) {
      console.log(err);
    }
  });

  const dataCrawlVyleceni = [{
    range: 'Ofi: vyleceni!C1:ZZ78',
    values: docsVyleceni,
  }];
  // Additional ranges to update ...
  let resourceCrawlVyleceni = {
    data: dataCrawlVyleceni,
    valueInputOption: "RAW",
  };
  sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: resourceCrawlVyleceni,
  }, (err, result) => {
    if (err) {
      console.log(err);
    }
  });

  const dataCrawlUmrti = [{
    range: 'Ofi: umrti!C1:ZZ78',
    values: docsUmrti,
  }];
  // Additional ranges to update ...
  let resourceCrawlUmrti = {
    data: dataCrawlUmrti,
    valueInputOption: "RAW",
  };
  sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: resourceCrawlUmrti,
  }, (err, result) => {
    if (err) {
      console.log(err);
    }
  });

  const dataCrawlAktivni = [{
    range: 'Ofi: aktivni!C1:ZZ78',
    values: docsAktivni,
  }];
  // Additional ranges to update ...
  let resourceCrawlAktivni = {
    data: dataCrawlAktivni,
    valueInputOption: "RAW",
  };
  sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: resourceCrawlAktivni,
  }, (err, result) => {
    if (err) {
      console.log(err);
    }
  });

  

  // testing
  // sheets.spreadsheets.values.get({
  //   spreadsheetId: spreadsheetId,
  //   range: 'Crawl: dnes!A2:E3',
  // }, (err, res) => {
  //   if (err) return console.log('The API returned an error: ' + err);
  //   const rows = res.data.values;
  //   if (rows.length) {
  //     // Print columns A and E, which correspond to indices 0 and 4.
  //     rows.map((row) => {
  //       console.log(`${row[0]}, ${row[1]}`);
  //     });
  //   } else {
  //     console.log('No data found.');
  //   }
  // });
}