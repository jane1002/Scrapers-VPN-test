import {
    downloadFilesSync,
    exportJsonObjToCSV,
    formatDocketNum,
    getDateFromEnv,
    openFolder,
    readRecordsFromCSVFile,
    writeJSONFileToFolder
} from '../../helper';
import * as Apify from 'Apify';
import { CADocket } from '../../models/CA_models/CADocket';
const { utils: { log }} = Apify;
import dotenv from 'dotenv';
import { CAFiling } from '../../models/CA_models/CAFiling';
dotenv.config({ path: '.env' });

export const CAScraper = async (): Promise<void> => {

    const browser = await Apify.launchPuppeteer();
    const page = await browser.newPage();

    // Configure the navigation timeout
    await page.setDefaultNavigationTimeout(0);

    const docketDetailPage = await browser.newPage();
    await docketDetailPage.setDefaultNavigationTimeout(0);

    await page.setViewport({
        width: 1200,
        height: 800
    });

    const list:Array<string> = readRecordsFromCSVFile('relevant-dockets.csv', 'CA');

    log.info(`[LENGTH OF CA DOCKETS: ${list.length}]`);

    for(const ID of list) {
        await page.bringToFront();
        await page.goto('https://apps.cpuc.ca.gov/apex/f?p=401', {
            waitUntil: 'domcontentloaded',
            timeout: 0
        });

        await page.click('#P1_CLEAR');

        await page.type('#P1_PROCEEDING_NUM', ID, { delay: 150 });
        await page.click('#P1_SEARCH');

        await page.waitFor(1500);

        const pageNum = 1;

        await page.waitFor(5000);
        log.info(`[SCRAPING SEARCH RESULT PAGE: ${pageNum}]`);

        const docketLinks: Array<string> = await page.$$eval(
            '.apexir_WORKSHEET_DATA > tbody > tr > td:nth-child(1) > a',
            links => links.map(link => link.toString())
        );
        await docketDetailPage.bringToFront();

        log.info(`[DOCKET LENGTH: ${docketLinks.length}]`);
        // todo: test if more than one docket link is possible?
        for (const link of docketLinks) {
            await docketDetailPage.waitFor(3500);

            await docketDetailPage.goto(link, {
                waitUntil: 'domcontentloaded'
            });

            // scraping data:
            log.info('[START SCRAPING ONE DOCKET]');
            const docketDetail: CADocket = await docketDetailPage.evaluate((): CADocket => {
                const docketID: string = (document.querySelector(
                    'div.rc-body > div > div.rc-content-main > h1') as HTMLElement).innerText;

                const filedBy: string = document.querySelector('#P56_FILED_BY').textContent;
                const industry: string = document.querySelector('#P56_INDUSTRY').textContent;
                const filingDate: string = document.querySelector(
                    '#P56_FILING_DATE').textContent;
                const category: string = document.querySelector('#P56_CATEGORY').textContent;
                const status: string = document.querySelector('#P56_STATUS').textContent;
                const docketDescription: string = document.querySelector(
                    '#P56_DESCRIPTION').textContent;
                const staff: string = document.querySelector('#P56_STAFF').textContent;

                return {
                    docketID,
                    filedBy,
                    industry,
                    filingDate,
                    category,
                    status,
                    docketDescription,
                    staff
                };
            });
            docketDetail.docketID = docketDetail.docketID.split('-')[0].trim();

            log.info(`[DOCKET DATA: ${JSON.stringify(docketDetail)}]`);

            // filter out electric dockets only
            exportJsonObjToCSV(docketDetail, 'dockets-CA.csv');

            log.info(`[END SCRAPING DOCKET: ${docketDetail.docketID} ]`);

            // scraping documents
            // R1211005
            const filings = await scrapingFilings(docketDetail.docketID, browser, docketDetailPage);

            if(filings.length > 0) {
                log.info(`[FILINGS LENGTH: ${filings.length}]`);
                await appendDownLinksToFilings(browser, filings);
            } else {
                log.info('[NO FILINGS');
            }

            // only test first row in each page
            // break;
        }

    }
    await browser.close();
};

const scrapingFilings = async (docketID, browser, page): Promise<Array<CAFiling>> => {
    log.info('[SCRAPING FILINGS]');
    await page.click('div.bl-body > div > div > ul > li:nth-child(2) > a');
    await page.waitFor(1500);

    // for debug
    page.on('console', msg => {
        for (let i = 0; i < msg.args().length; ++i)
            console.log(`${i}: ${msg.args()[i]}`);
    });

    let hasNextPage = true;
    const filings: Array<CAFiling> = new Array<CAFiling>();

    const scrapingOnePageFillings = async (): Promise<Array<CAFiling>> => {
        return await page.evaluate((docketID) => {
            let rows = [];
            const filings = new Array<CAFiling>();

            const evenRows = [...document.querySelectorAll('tr.even')];
            const oddRows = [...document.querySelectorAll('tr.odd')];

            if(evenRows && oddRows) {
                rows = evenRows.concat(oddRows);
            }

            for(const row of rows) {
                let filing: CAFiling = {} as CAFiling;
                const cells = row.cells;
                const filingDate = cells[0].textContent;
                const documentType = cells[1].textContent;
                const filedBy = cells[2].textContent;
                const filingDescription = cells[3].textContent;
                const downloadLinks: Array<string> = [];
                let filingID;
                let link = '';
                if(cells[1].firstChild) {
                    link = cells[1].firstChild.getAttribute('href');
                    const pattern = /[0-9]+/;
                    filingID =  pattern.exec(link)[0];
                } else {
                    console.log('[NO DOC LINK]');
                    // todo: need test if this is possible
                }
                downloadLinks.push(link);

                filing = { docketID, filingID, filingDate, documentType, filedBy, filingDescription, downloadLinks };
                filings.push(filing);
                // test
                // break;
            }

            return filings;

        }, docketID);
    };

    let idx = 1;
    while(hasNextPage) {
        await page.waitFor(1500);

        const fillingsArr: Array<CAFiling> = await scrapingOnePageFillings();
        filings.push(...fillingsArr);

        if(await page.$('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a > img[title = "Next"]')) {
            log.info(`[DOC HAS MORE THAN ONE PAGE: this is page ${idx}]`);
            hasNextPage = true;
            if(idx == 1) {
                await page.click('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a');
                await page.waitFor(2500);

                idx += 1;
            } else {
                await page.click('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a:nth-child(2)');
                await page.waitFor(2500);
            }

            // for test
            // if(idx == 3)
            //     break;
        } else {
            hasNextPage = false;
            log.info(`[ONE PAGE ONLY, this is page ${idx} ]`);
        }
    }

    return filings;
};


const appendDownLinksToFilings = async (browser, filings: Array<CAFiling>): Promise<void> => {
    log.info('[START GETTING DOWNLOAD LINKS]');
    const docDownloadPage = await browser.newPage();

    for(const filing of filings) {
        if(filing.downloadLinks.length > 0) {
            await docDownloadPage.goto(filing.downloadLinks[0], {
                waitUntil: 'domcontentloaded'
            });

            await docDownloadPage.waitFor(1500);

            const links = await docDownloadPage.evaluate(() => {
                return [...document.querySelectorAll('#ResultTable > tbody > tr > td.ResultLinkTD > a')].map((link: HTMLBaseElement) => {
                    return link.href;
                });
            });

            filing.downloadLinks = [];
            filing.downloadLinks = links.length > 0 ? links : [];

            log.info(`[FILING DATA WITH DOWNLOAD LINKS: ${JSON.stringify(filing)}`);
        }

        // export module
        exportJsonObjToCSV(filing, 'CA-filings.csv');
        const pt = openFolder(`${filing.docketID}/${filing.filingID}`);
        writeJSONFileToFolder(filing, pt, `${filing.filingID}.json`);
        if(filing.downloadLinks.length > 0)
            downloadFilesSync(filing.downloadLinks, pt);
    }

    await docDownloadPage.close();
};