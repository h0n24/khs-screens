const puppeteer = require('puppeteer');
const save = require('./_save');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
      width: 990,
      height: 900
    });
    await page.goto('https://www.khspce.cz/aktualni-situace-ve-vyskytu-koronaviru-v-pardubickem-kraji-2/', {
      waitUntil: 'networkidle2'
    });

    // screenshot
    await page.screenshot({
      path: 'out/09-khspce.png'
    });

    // crawlování dat
    const crawledData = await page.evaluate(() => {
      let content = document.querySelectorAll("#content .entry-content");
      let arr = Array.prototype.slice.call(content);
      let preparedArray = [];

      let okresZkratky = {
        "PA":"Pardubice",
        "CR":"Chrudim",
        "SY":"Svitavy",
        "ÚO":"Ústí nad Orlicí"
      }

      const obyvatelstvo = {
        "Chrudim": 104613,
        "Pardubice": 175441,
        "Svitavy": 104333,
        "Ústí nad Orlicí": 138275
      };
      

      function prepareNumber(string) {
        let preparedNumber = string.replace(/[^0-9]/g, '');
        preparedNumber = parseInt(preparedNumber, 10);
        return preparedNumber;
      }

      try {
        let title = arr[0].innerText;

        if (title !== undefined) {
          if (title.includes('okres PA')) {

            let paragraphs = arr[0].querySelectorAll("p");

            for (let rowIndex = 0; rowIndex < paragraphs.length; rowIndex++) {
              const paragraph = paragraphs[rowIndex];
              const paragraphText = paragraph.innerText

              try {
                if (paragraphText.includes('okres ')) {

                  // začátek vypadá jako: "okres ÚO: 81", potřebujeme jen ÚO
                  const substringBefore = 'okres '.length;
                  const substringAfter = 2;

                  const okresZnacka = paragraphText.substr(substringBefore, substringAfter);
                  const okres = okresZkratky[okresZnacka];

                  // tagy se kříží a nejsou jednotné (bold, strong), nemůžeme použít strukturu DOM
                  // nutno rozdělit podle "aktuálně nemocných"
                  let paragraphSplit = paragraphText.split("aktuálně nemocných");

                  let pozitivni = prepareNumber(paragraphSplit[0]);
                  let aktivni = prepareNumber(paragraphSplit[1]);

                  const vyleceni = null;
                  const umrti = null;
                  const obyvatel = obyvatelstvo[okres];

                  preparedArray.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
                }

              } catch (error) {

              }
            }

            return preparedArray;
          }
        }
      } catch (error) {

      }
    });

    save('out/data.json', {
      "09": crawledData
    });

    await browser.close();
  })();
}