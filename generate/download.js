// require
const fs = require('fs');

const report = require('./src/_report');

// --- globální nastavení a proměnné -------------------------------------------

// výpis chyb & a nastavení max listeners na vyšší hodnotu (lepší paralelizace)
process.setMaxListeners(0);
process.on('uncaughtException', errorHappened);

function errorHappened(arg) {
  let title = "Error".padEnd(12, ' ');
  title = `\x1b[31m${title}\x1b[0m`;
  console.log(title, arg);
}

function createNewFileOrSkip(file) {
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
  });
}

// --- vytvořit základ pro datové json soubory ---------------------------------
createNewFileOrSkip("out/data.json");
createNewFileOrSkip("out/time.json");
// createNewFileOrSkip("out/errors.json");


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

// --- zjištění posledních časů aktualizace ------------------------------------

// čas poslední aktualizace přímo k jednotlivým KHS
const rawTime = fs.readFileSync('out/time.json');
const readTime = JSON.parse(rawTime);


// --- konkrétní scripty od khs ------------------------------------------------

function runOnlyOutdated() {
  let promisesList = [];

  const date = new Date();
  const ISOdate = date.toISOString();

  for (let index = 0; index < seznamKHS.length; index++) {

    const khs = seznamKHS[index];
    const lastTime = readTime[index];

    // pokud nejsou data ze dneška
    let lastDay = null;
    try {
      lastDay = lastTime.substring(0, 10);
    }
    catch (error) {
    }

    const today = ISOdate.substring(0, 10);

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

// jen pro test
if (testing) {
  function khsn(string) {
    let number = parseInt(string, 10);
    number = number - 1;
    return seznamKHS[number];
  }

  require(`./src/${khsn("6")}`)();
} else {
  // jednotlivé scripty pro khs
  const promisesList = runOnlyOutdated();

  Promise.all(promisesList).then(function (results) {
    // API results in the results array here
    // processing can continue using the results of all three API requests
    console.log("Všechny scripty staženy.");
  }, function (err) {
    // an error occurred, process the error here
    console.log("Nastala chyba scriptů.")
  });
}



// todo ------------------------------------------------------------------------
// refactor: exposeFunction pro clean
// puppeteer - tor
// dopočítat některá data z oficiální API
// dodělat - porovnání s API z ministerstva
// automatizace přes apify (půjde?)

// isdown api? - kontrolovat favicony, případně podobně malé části
// https://api-prod.downfor.cloud/httpcheck/http://www.khsova.cz