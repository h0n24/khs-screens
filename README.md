# Evidence denních dat z krajských hygienických stanic, COVID-19

Tento kód slouží ke třem účelům:
- [automatický robot](generate/), který vytváří screenshoty a převádí data z webů KHS do tabulky [COVID-19 po okresech, KHS](https://docs.google.com/spreadsheets/d/1FFEDhS6VMWon_AWkJrf8j3XxjZ4J6UI1B2lO3IW-EEc/edit?usp=sharing)
- každodenní [záloha screenshotů všech 14 krajských hygienických stanic](2020/)
- měsíční záloha [Google Spreadsheet](https://docs.google.com/spreadsheets/d/1FFEDhS6VMWon_AWkJrf8j3XxjZ4J6UI1B2lO3IW-EEc/edit?usp=sharing) se všemi [daty](backup/)

## Data
:warning: ***Všechna data jsou dostupná na Google Spreadsheet [COVID-19 po okresech, KHS](https://docs.google.com/spreadsheets/d/1FFEDhS6VMWon_AWkJrf8j3XxjZ4J6UI1B2lO3IW-EEc/edit?usp=sharing), případně na zkráceném odkazu:***
``` 
https://www.sablatura.info/covid/data/khs 
```

### Zdroje dat

kraj | url
|---|---|
Jihočeský kraj	|	khscb.cz
Jihomoravský kraj	|	khsbrno.cz
Karlovarský kraj	|	khskv.cz
Kraj Vysočina	|	khsjih.cz
Královéhradecký kraj |	khshk.cz
Liberecký kraj |	khslbc.cz
Moravskoslezský kraj	|	khsova.cz
Olomoucký kraj	|	khsolc.cz
Pardubický kraj	|	khspce.cz
Plzeňský kraj	|	khsplzen.cz
Praha	|	hygpraha.cz
Středočeský kraj	|	khsstc.cz
Ústecký kraj	|	khsusti.cz
Zlínský kraj	|	khszlin.cz

### Postup sběru dat
Většinu dat sbírá robot (web crawler) automaticky. Každý den jej několikrát spustím, data se stáhnou z webů, automaticky vyčistí a nahrajou na list [Crawl: dnes](https://docs.google.com/spreadsheets/d/1FFEDhS6VMWon_AWkJrf8j3XxjZ4J6UI1B2lO3IW-EEc/edit#gid=996854350). Finální crawl dělám na konci dne, typicky mezi 22 a 2 hodinou ranní. Poté data ručně kontroluji, opravuji chyby OCR a některá data dopisuji.

Počty z KHS jsou verifikované, tedy trochu nižší, než standardně zveřejňuje [Ministerstvo zdravotnictví](https://onemocneni-aktualne.mzcr.cz/covid-19).
To je proto, že evidují data zaslaná z laboratoří přímo na ISIN, KHS ale následně přebírají data z ISIN a kontrolují (a pak zveřejňují na webu). A pak taky netrpí tím, že by byly o 7-11 dní zpožděné.

## Použité technologie
- **Tesseract.js**, umělá inteligence natrénovaná pro čtení dat z Ostravy, Plzně a Zlína (bohužel dodávají data jako obrázek)
- **Puppeteer** (konzolová verze Chrome), který bleskurychle prochází web
- **PDFreader**, který exportuje texty z PDF a jejich pozice
- **Express** server, který přes pdf.js generuje z PDF obrázky pro použití v OCR (bohužel neexistuje stabilnější node.js řešení bez nutnosti přepsat celé pdf.js od Mozilly)
- **Sharp**, bleskurychlé modifikace obrázků pro účely OCR

Pozor, celé repo má více než 3 GB, samotný zdrojový kód pak cca 500 MB.

Při vývoji zemřely tisíce subverzí umělé inteligence. Zvláště ty, které nedokázaly rozlišit mezi 6 a 8. Nechť je jim křemíkové nebe lehké. Pokud znáte Sarah Connorovou, možná budu potřebovat číslo.

## Kontakt a další
- Email: [h0n24.cz@gmail.com](mailto:h0n24.cz@gmail.com)
- FB: [Messenger](https://www.messenger.com/t/jan.sablatura)

Moje další COVID-19 API lze nalézt na [COVID API](https://www.sablatura.info/covid/api/).
