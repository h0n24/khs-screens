// require
const fs = require('fs');

const report = require('./src/_report');

// --- globální nastavení a proměnné -------------------------------------------

console.time('download.js');

// výpis chyb & a nastavení max listeners na vyšší hodnotu (lepší paralelizace)
process.setMaxListeners(0);
process.on('uncaughtException', errorHappened);

function errorHappened(arg) {
  let title = "Error".padEnd(12, ' ');
  title = `\x1b[31m${title}\x1b[0m`;
  console.log(title, arg);
}

// process.on('unhandledRejection', error => {
//   console.log('unhandledRejection', error);
// });


// --- vytvořit základ pro datové json soubory ---------------------------------
function createNewFileOrSkip(file) {
  return new Promise((resolve, reject) => {
    const dataFile = file;
    const [, shortFile] = file.split("/");
    // zjistíme pokud soubor existuje, jinak jej vytvoříme
    fs.access(dataFile, fs.constants.F_OK | fs.constants.W_OK, (err) => {
      if (err) {
        // console.error(`${dataFile} ${err.code === 'ENOENT' ? 'does not exist' : 'is read-only'}`);
        fs.writeFileSync(dataFile, "[]");
        // report(shortFile, "vytvořen");
      } else {
        // if (shortFile === "data.json") {
        //   report(shortFile, "existuje, updatuji data");
        // }
      }
      resolve();
    });
  });
}

// --- zjištění posledních časů aktualizace ------------------------------------
(async () => {
  await createNewFileOrSkip("out/data.json");
  await createNewFileOrSkip("out/time.json");
  // await createNewFileOrSkip("out/errors.json");
})();

// --- zpracování jednotlivých dat ---------------------------------------------

console.log(""); // odsazení prvního řádku pro lepší čitelnost

// zobrazování posledního smazání dat, ať se neevidují příliš stará data
const date = new Date();
try {
  const rawDateFolderCleaned = fs.readFileSync("out/first.json");
  const [ISOFolderCleaned] = JSON.parse(rawDateFolderCleaned);

  const dateFolderCleaned = new Date(ISOFolderCleaned);
  const diffTime = Math.abs(date.getTime() - dateFolderCleaned.getTime());
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

  const timeFolderCleaned = new Date(diffTime).toISOString().substr(11, 8);
  report("out/ clean", timeFolderCleaned);

  if (diffHours > 12) {
    report("out/ clean", "ERR_WORKING_WITH_OLD_DATA");
  }
} catch (error) {
  const dateIso = date.toISOString();
  fs.writeFileSync("out/first.json", `["${dateIso}"]`);
  report("out/ clean", "vytvořen first.json");
}


// --- konkrétní scripty od khs ------------------------------------------------
function runOnlyOutdated() {
  let promisesList = [];

  let readTime = [];

  // čas poslední aktualizace přímo k jednotlivým KHS
  try {
    const rawTime = fs.readFileSync('out/time.json');
    readTime = JSON.parse(rawTime);
  } catch (error) {
    
  }

  const date = new Date();
  const ISOdate = date.toISOString();

  for (let index = 0; index < seznamKHS.length; index++) {
    const khs = seznamKHS[index];
    const lastTime = readTime[index];
    
    let lastDay = null;
    if (lastTime !== undefined && lastTime !== null) {
      lastDay = lastTime.toString().substring(0, 10);
    }
    
    const today = ISOdate.toString().substring(0, 10);

    // pokud nejsou data ze dneška
    if (lastDay !== today) {
      promisesList.push(require(`./src/${khs}`));
    }
  }
  return promisesList;
}

const seznamKHS = ["01-khscb", "02-khsbrno", "03-khskv", "04-khsjih", "05-khshk", "06-khslbc", "07-khsova", "08-khsolc", "09-khspce", "10-khsplzen", "11-hygpraha", "12-khsstc", "13-khsusti", "14-khszlin"];

// typický model dat:
// okres, pozitivni, vyleceni, umrti, aktivni, obyvatel

const testing = false;
let promisesList;

if (testing) {
  // jen pro test
  function khsn(string) {
    let number = parseInt(string, 10);
    number = number - 1;
    return seznamKHS[number];
  }

  promisesList = [require(`./src/${khsn("06")}`)];
  // promisesList = [require(`./src/${khsn("7")}`), require(`./src/${khsn("10")}`), require(`./src/${khsn("14")}`)];
} else {
  // jednotlivé scripty pro khs
  promisesList = runOnlyOutdated();
}

Promise.all(promisesList).then(function (results) {
  // API results in the results array here
  // processing can continue using the results of all three API requests

  console.log("");
  console.timeEnd('download.js');
  console.log("Všechny scripty provedeny.");

  // todo -> nahrání na web
}, function (err) {
  // an error occurred, process the error here
  console.log("");
  console.log("Nastala chyba scriptů.")
});



// todo ------------------------------------------------------------------------

// zlín - detekovat automaticky x/y pozice grafu

// dopočítat některá data z oficiální API
// + automatizovat verifikaci listů -> pokud sedí, rozřadit

// big puppeteer refactor:
// -> https://www.youtube.com/watch?v=MbnATLCuKI4
// - exposeFunction pro clean
// - puppeteer - tor

// puppeteer může být rychlejší přes
// const context = await browser.createIncognitoBrowserContext();
// await context.close();

// -> lze blokovat některé requesty (zrychlení stahování)
// const metrics = await page.metrics();
// console.log(metrics);

// otestování dat mezi sebou tam, kde to jde (podobně jako khscb) 
// a přidávat do errors.json, pokud nesedí
// ukázka: U okresu ${okres} nesedí pozitivni = vyleceni - aktivni - umrti!

// todo: praha se dá ověřovat s json api

// isdown api? - kontrolovat favicony, případně podobně malé části
// https://api-prod.downfor.cloud/httpcheck/http://www.khsova.cz

// automatizace přes apify (půjde?)