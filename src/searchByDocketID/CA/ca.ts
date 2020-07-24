import {
    downloadFilesSync,
    exportJsonObjToCSV,
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

    const list:Array<string> = readRecordsFromCSVFile('test-file.csv', 'CA');

    log.info(`[LENGTH OF CA DOCKETS: ${list.length}]`);

    for(const ID of list) {
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);
        await page.setCacheEnabled(false);

        await page.bringToFront();
        await page.goto('https://apps.cpuc.ca.gov/apex/f?p=401', {
            waitUntil: 'domcontentloaded',
            timeout: 0
        });

        await page.click('#P1_CLEAR');

        await page.type('#P1_PROCEEDING_NUM', ID, { delay: 150 });
        await page.click('#P1_SEARCH');

        const pageNum = 1;
        await page.waitForNavigation({
            waitUntil: 'domcontentloaded'
        });

        log.info(`[SCRAPING SEARCH RESULT PAGE: ${pageNum}]`);

        const docketLinks: Array<string> = await page.$$eval(
            '.apexir_WORKSHEET_DATA > tbody > tr > td:nth-child(1) > a',
            links => links.map(link => link.toString())
        );

        log.info(`[DOCKET LENGTH: ${docketLinks.length}]`);
        // todo: test if more than one docket link is possible?
        for (const link of docketLinks) {
            const docketDetailPage = await browser.newPage();
            await docketDetailPage.setDefaultNavigationTimeout(0);
            // await docketDetailPage.setCacheEnabled(false);

            await docketDetailPage.bringToFront();

            // must have
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
            // await docketDetailPage.click('div.bl-body > div > div > ul > li:nth-child(2) > a');
            // await docketDetailPage.waitFor(2500);
            // const filings: Array<CAFiling> = new Array<CAFiling>();
            // let idx = 1;
            //
            // // page error handling and pre check
            // const needReset = await docketDetailPage.evaluate(() => {
            //     return document.querySelector('#apexir_DATA_PANEL > table > tbody > tr > td > span > a').textContent == 'Reset Pagination';
            // });
            //
            // if(needReset) {
            //     await docketDetailPage.click('#apexir_DATA_PANEL > table > tbody > tr > td > span > a');
            // }
            //
            // while(await docketDetailPage.$('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a > img[title = "Previous"]')) {
            //     await docketDetailPage.click('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a:nth-child(1)');
            //     await docketDetailPage.waitFor(2500);
            // }
            //
            // while(true) {
            //     await docketDetailPage.waitFor(2500);
            //
            //     log.info(`[SCRAPING FILINGS ON ONE PAGE]`);
            //     const fillingsArr: Array<CAFiling> =  await docketDetailPage.evaluate((docketID) => {
            //         let rows = [];
            //         const filings = new Array<CAFiling>();
            //
            //         const evenRows = [...document.querySelectorAll('tr.even')];
            //         const oddRows = [...document.querySelectorAll('tr.odd')];
            //
            //         if(evenRows && oddRows) {
            //             rows = evenRows.concat(oddRows);
            //         }
            //
            //         console.log('odd row: ', oddRows.length);
            //         console.log('even row: ', evenRows.length);
            //         console.log('row: ', rows.length);
            //         for(const row of rows) {
            //             let filing: CAFiling = {} as CAFiling;
            //             const cells = row.cells;
            //             const filingDate = cells[0].textContent;
            //             const documentType = cells[1].textContent;
            //             const filedBy = cells[2].textContent;
            //             const filingDescription = cells[3].textContent;
            //             const downloadLinks: Array<string> = [];
            //             let filingID;
            //             let link = '';
            //             if(cells[1].firstChild) {
            //                 link = cells[1].firstChild.getAttribute('href');
            //                 const pattern = /[0-9]+/;
            //                 filingID =  pattern.exec(link)[0];
            //             } else {
            //                 console.log('[NO DOC LINK]');
            //                 // todo: need test if this is possible
            //             }
            //             downloadLinks.push(link);
            //
            //             filing = { docketID, filingID, filingDate, documentType, filedBy, filingDescription, downloadLinks };
            //             filings.push(filing);
            //             // test
            //             break;
            //         }
            //
            //         return filings;
            //
            //     }, docketDetail.docketID);
            //
            //     log.info(`[END OF SCRAPING FILINGS ON ONE PAGE]`);
            //     log.info(`[FILING LENGTH OF ONE PAGE: ${fillingsArr.length}]`);
            //     filings.push(...fillingsArr);
            //     // if(docketDetail.docketID == 'A1812009')
            //     //     await docketDetailPage.waitFor(400000);
            //
            //     try {
            //         if(idx == 1) {
            //             console.log('index = 1');
            //             // await page.waitForSelector('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a');
            //             await docketDetailPage.click('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a');
            //             console.log('index=1, after click');
            //         } else {
            //             console.log('index >1');
            //             await docketDetailPage.click('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a:nth-child(2)');
            //             console.log('index>1, after click');
            //         }
            //         idx += 1;
            //
            //     } catch (e) {
            //         log.info(`[Pagination is done: ${e.message}]`);
            //         break;
            //     }
            // }


            const filings = await scrapingFilings(docketDetail.docketID, browser, docketDetailPage);

            if(filings.length > 0) {
                log.info(`[FILINGS LENGTH: ${filings.length}]`);
                await appendDownLinksToFilings(browser, filings);
            } else {
                log.info('[NO FILINGS');
            }

            // only test first row in each page
            await docketDetailPage.close();
            break;
        }
        await page.close();
    }
    console.log('END browser');
    await browser.close();
};

/***
 * Scrape all filings in multiple pages
 * @param docketID
 * @param browser
 * @param page: docketDetailPage is passed in
 */
const scrapingFilings = async (docketID, browser, page): Promise<Array<CAFiling>> => {
    log.info('[SCRAPING FILINGS]');
    await page.click('div.bl-body > div > div > ul > li:nth-child(2) > a');
    await page.waitFor(2500);

    // for debug in browser
    // page.on('console', msg => {
    //     for (let i = 0; i < msg.args().length; ++i)
    //         console.log(`${i}: ${msg.args()[i]}`);
    // });

    // page error handling and pre check
    const needReset = await page.evaluate(() => {
        if(document.querySelector('#apexir_DATA_PANEL > table > tbody > tr > td > span > a')) {
            return document.querySelector('#apexir_DATA_PANEL > table > tbody > tr > td > span > a').textContent == 'Reset Pagination';
        }
        return false;
    });

    if(needReset) {
        await page.click('#apexir_DATA_PANEL > table > tbody > tr > td > span > a');
    }

    while(await page.$('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a > img[title = "Previous"]')) {
        await page.click('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a:nth-child(1)');
        await page.waitFor(2500);
    }

    let hasNextPage = true;
    const filings: Array<CAFiling> = new Array<CAFiling>();
    let idx = 1;

    while(hasNextPage) {
        await page.waitFor(2500);

        const fillingsArr: Array<CAFiling> = await scrapingOnePageFillings(page, docketID);

        log.info(`[FILING LENGTH OF ONE PAGE: ${fillingsArr.length}]`);
        filings.push(...fillingsArr);

        const nextPageIcon = await page.$('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a > img[title = "Next"]');

        if(nextPageIcon) {
            log.info(`[DOC HAS MORE THAN ONE PAGE: this is page ${idx}]`);
            hasNextPage = true;
            if(idx == 1) {
                console.log('index  = 1');
                await page.click('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a');
                await page.waitFor(2500);

            } else {
                console.log('index  > 1');
                await page.click('#apexir_DATA_PANEL > table > tbody > tr:nth-child(1) > td > span > a:nth-child(2)');
                await page.waitFor(2500);
            }

            idx += 1;
            // for test
            // if(idx == 3)
            //     break;
        } else {
            hasNextPage = false;
            await page.waitFor(1500);
            log.info(`[Last page, this is page ${idx} ]`);
        }

    }
    return filings;
};

/***
 * Scrape one page filings
 * @param page: docketDetailPage
 * @param docketID
 */
const scrapingOnePageFillings = async (page, docketID: string): Promise<Array<CAFiling>> => {
    log.info(`[SCRAPING FILINGS ON ONE PAGE]`);
    return await page.evaluate((docketID) => {
        let rows = [];
        const filings = new Array<CAFiling>();

        // todo:
        const evenRows = [...document.querySelectorAll('tr.even')];
        const oddRows = [...document.querySelectorAll('tr.odd')];

        if(evenRows && oddRows) {
            rows = evenRows.concat(oddRows);
        } else {
            rows = evenRows ? evenRows : oddRows ? oddRows : rows;
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

/***
 * Add download links to each record, since download link of filings is in the other web page, so this method is used to combine record
 * metadata from scrapingFilings method and download links got from this method.
 * @param browser
 * @param filings
 */
const appendDownLinksToFilings = async (browser, filings: Array<CAFiling>): Promise<void> => {
    log.info('[START GETTING DOWNLOAD LINKS]');
    const docDownloadPage = await browser.newPage();

    for(const filing of filings) {
        if(filing.downloadLinks.length > 0) {
            await docDownloadPage.goto(filing.downloadLinks[0], {
                waitUntil: 'domcontentloaded'
            });

            await docDownloadPage.waitFor(2500);

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
        // const pt = openFolder(`${filing.docketID}/${filing.filingID}`);
        // writeJSONFileToFolder(filing, pt, `${filing.filingID}.json`);
        // if(filing.downloadLinks.length > 0)
        //     downloadFilesSync(filing.downloadLinks, pt);
    }

    await docDownloadPage.close();
};


