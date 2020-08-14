const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), uploadData);
});

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


// --------------------------------------
// samotná práce s daty na Google Docs

const spreadsheetId = '1FFEDhS6VMWon_AWkJrf8j3XxjZ4J6UI1B2lO3IW-EEc';

// čtení dat ze souboru
const rawData = fs.readFileSync('out/data.json');
let readData = JSON.parse(rawData);

// model dat:
// okres, pozitivni, vyleceni, umrti, aktivni, obyvatel
// potřebujeme -> bez okresu

let bezOkresu = [];

for (let rowIndex = 0; rowIndex < readData.length; rowIndex++) {
  const row = readData[rowIndex];

  try {
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const col = row[colIndex];
      const colBezOkresu = col.slice(1);
      bezOkresu.push(colBezOkresu);
    }
  } catch (error) {
    console.log(`Okres s pořadovým číslem ${rowIndex+1} se nenačetl protože chybí data v json.`);

    const poctyOkresuNaKraj = [7,7,3,5,5,4,6,5,4,7,1,12,7,4];

    for (let krajIndex = 0; krajIndex < poctyOkresuNaKraj.length; krajIndex++) {
      const kraj = poctyOkresuNaKraj[krajIndex];

      // přidej volná pole pokud je v daném kraji chyba
      if (rowIndex === krajIndex) {
        for (let index = 0; index < kraj; index++) {
          bezOkresu.push(["", "", "", "", ""]);
        }
      }
    }
  }
}

// práce s časem
const dateObj = new Date(); 
const dateFull = dateObj.toISOString();
const [dateShort, ] = dateFull.split("T");

const hours = dateObj.getHours();
let minutes = dateObj.getMinutes();

if (minutes < 10) {
  minutes = `0${minutes}`
}

const timeString = `Aktualizace v ${hours}:${minutes}`

/**
 * Gets the data from Spreadsheet
 * @see https://docs.google.com/spreadsheets/d/1FFEDhS6VMWon_AWkJrf8j3XxjZ4J6UI1B2lO3IW-EEc/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function uploadData(auth) {

  const sheets = google.sheets({version: 'v4', auth});

  // zápis data a času ------------------
  let values = [
    [
      timeString, dateShort
    ],
    // Additional rows ...
  ];
  let data = [{
    range: 'Crawl: dnes!A1:B1',
    values,
  }];
  // Additional ranges to update ...
  let resource = {
    data,
    valueInputOption: "RAW",
  };
  sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource,
  }, (err, result) => {
    if (err) {
      console.log(err);
    }
  });

  // zápis crawlovaných dat ------------------
  // let values = [
  //   [
  //     timeString, dateShort
  //   ],
  //   // Additional rows ...
  // ];
  const dataCrawl = [{
    range: 'Crawl: dnes!C2:G78',
    values: bezOkresu,
  }];
  // Additional ranges to update ...
  let resourceCrawl = {
    data: dataCrawl,
    valueInputOption: "RAW",
  };
  sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: resourceCrawl,
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