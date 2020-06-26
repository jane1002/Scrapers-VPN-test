// This is the main Node.js source code file of your actor.
// It is referenced from the "scripts" section of the package.json file,
// so that it can be started by running "npm start".

// Import Apify SDK. For more information, see https://sdk.apify.com/
const Apify = require('apify');

const {exportJsonObjToCSV} = require('../helpers');


Apify.main(async () => {

    console.log('Launching Puppeteer...');
    const browser = await Apify.launchPuppeteer();

    const page = await browser.newPage();

    const filterSwitch = true;
    console.log('browser start');

    // Configure the navigation timeout
    await page.setDefaultNavigationTimeout(0);

    await page.goto('https://apps.cpuc.ca.gov/apex/f?p=401', {
        waitUntil: 'domcontentloaded', // Remove the timeout
        timeout: 0
    });

    await page.setViewport({
        width: 1200,
        height: 800
    });

    console.log('main search page loading done');

    // const ht = await page.content();
    // log(ht);

    // Fill form fields and select desired search options
    console.log('Fill in search form');

    // search conditions, submit
    const fromDate = '06/01/2019';
    const toDate = '06/01/2020';
    const proceedingNum = '';
    const filerName = '';
    const description = '';
    const assignment = '';

    // await page.type('#P1_PROCEEDING_NUM', proceedingNum, { delay: 100 });
    // await page.type('#P1_FILER_NAME', filerName, { delay: 100 });
    await page.type('#P1_FILED_DATE_L', fromDate, { delay: 100 });
    await page.type('#P1_FILED_DATE_H', toDate, { delay: 100 });
    // await page.type('#P1_DESCRIPTION', description, { delay: 100 });
    // await page.type('#P1_LAST_NAME', assignment, { delay: 100 });

    await page.click('#P1_SEARCH');
    let output = 'CA_results';


    output = proceedingNum? `${output}_${proceedingNum}`: output;
    output = filerName? `${output}_${filerName}`: output;
    output = fromDate? `${output}_${fromDate}`: output;
    output = toDate? `${output}_${toDate}`: output;
    output = description? `${output}_${description}`: output;
    output = assignment? `${output}_${assignment}`: output;
    output = `${output}.csv`;
    output = replaceAll(output, '/', '_');

    await page.waitFor(1500);

    console.log('search result page loading done');
    const docketDetailPage = await browser.newPage();
    await docketDetailPage.setDefaultNavigationTimeout(0);
    let pageNum = 1;

    let dockets = [];

    while(true) {

        await page.waitFor(5000);

        // go to detail page
        console.log('search result page: ', pageNum);
        // const ht = await page.content();
        // log(ht);

        const docketLinks = await page.$$eval(
            '#\\31 19089023003070248410 > tbody > tr > td:nth-child(1) > a',
            links => {
                let arr = [];
                for (let link of links) {
                    arr.push(link.href)
                }
                return arr
            });
        // const docketLinks = await page.$$('td[header="PROCEEDING_STATUS_DESC"] > a');

        for (let link of docketLinks) {
            console.log(link);
            await docketDetailPage.waitFor(3500);

            await docketDetailPage.goto(link, {
                waitUntil: 'domcontentloaded'
            });

            // scraping data:
            console.log('start scraping one docket');
            const docketDetail = await docketDetailPage.evaluate(() => {
                let docketNum = document.querySelector(
                    'div.rc-body > div > div.rc-content-main > h1').innerText;
                const filedBy = document.querySelector('#P56_FILED_BY').innerText;
                const industry = document.querySelector('#P56_INDUSTRY').innerText;
                const fillingDate = document.querySelector(
                    '#P56_FILING_DATE').innerText;
                const category = document.querySelector('#P56_CATEGORY').innerText;
                const status = document.querySelector('#P56_STATUS').innerText;
                const description = document.querySelector(
                    '#P56_DESCRIPTION').innerText;
                const staff = document.querySelector('#P56_STAFF').innerText;

                return {
                    docketNum,
                    filedBy,
                    industry,
                    fillingDate,
                    category,
                    status,
                    description,
                    staff
                };
            });
            docketDetail.docketNum = processDocketNumField(docketDetail.docketNum);

            console.log('[get data]', JSON.stringify(docketDetail));
            // data.dockets.push(docketDetail);
            dockets.push(docketDetail);

            if(filterSwitch && outputFilter(docketDetail, 'industry', 'electric')) {
                exportJsonObjToCSV(docketDetail, output);
            }
            console.log('end scraping docket: ', docketDetail.docketNum);
            // only test first row in each page
            break;
        }

        try {
            console.log('next page block');
            // await browser.pages()[1];
            await page.bringToFront();
            if(pageNum == 1) {
                await page.click('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a');
            } else {
                await page.click('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a:nth-child(2)');
            }
            pageNum += 1;
        } catch (e) {
            console.log(e.message);
            break;
        }
    }

    await browser.close();

    console.log('Done.');
});

const processDocketNumField = (docketNumField) => {
    if(docketNumField) {
        return docketNumField.trim().split('-')[0].trim();
    }
};

const replaceAll = (str , replaceKey , replaceVal) => {
    const reg = new RegExp(replaceKey , 'g');
    return str.replace(reg , replaceVal || '');
};

const outputFilter = (obj, mustHaveFieldKey, mustHaveFieldValue) => {
    if(typeof obj === 'object') {
        for(let field of Object.keys(obj)) {
            if (field === mustHaveFieldKey && obj[field].toLowerCase().trim() === mustHaveFieldValue) {
                console.log(JSON.stringify(obj.docketNum));
                return true;
            }
        }
    }
    return false;
};
