import { TXDocket } from '../models/TX_models/TXDocket';
import { TXFiling } from '../models/TX_models/TXFiling';
import * as Apify from 'Apify';
import { exportJsonObjToCSV, formatDocketNum, openFolder, writeJSONFileToFolder } from '../helper';
import { RequestQueue } from 'Apify';

const { utils: { log }} = Apify;
const baseUrl = 'http://interchange.puc.texas.gov';

export const handleDockets = async ($: CheerioSelector, requestQueue: RequestQueue): Promise<void> => {
    // log.info('[handle docket]');
    const lastIndex = $('table tr').get().length;
    const dataset = await Apify.openDataset('TX-DOCKETS');

    $('table').find('tr').each(async (index: number, el: CheerioElement) => {
        // for test:
        // if(index > 0 && index < 3) {
        if (index != 0 && index < lastIndex - 1) {
            const docketInfo: TXDocket = {} as TXDocket;

            const docketNum = $(el).find('td > strong > a').eq(0).text().trim();
            const docketLink = $(el).find('td > strong > a').attr('href');

            if (docketLink) {
                const url: URL = new URL(docketLink, baseUrl);
                await requestQueue.addRequest({
                    url: url.href
                });
            }

            const filings = $(el).find('td').eq(1).text().trim();
            const utility = $(el).find('td').eq(2).text().trim();
            const description = $(el).find('td').eq(3).text().trim();

            docketInfo.docketID = docketNum;
            docketInfo.numberOfFilings = Number(filings);
            docketInfo.utility = utility;
            docketInfo.docketDescription = description;
            log.info(`[DOCKET DATA: ${JSON.stringify(docketInfo)}]`);

            // export docket metadata
            exportJsonObjToCSV(docketInfo, 'TX-dockets.csv');
            await dataset.pushData(docketInfo);

            //
            const pt = openFolder(docketNum);
            writeJSONFileToFolder(docketInfo, pt, `${docketNum}.json`);
        }
    });

    await enqueueNextPageLinks($, requestQueue);
};

/*
 edge case: filings don't have download link, e.g.15599, need to be persisted here instead of document level
 */

export const handleFilings = async ($: CheerioSelector, requestQueue: RequestQueue): Promise<void> => {
    // Handle details
    // log.info('[handle filings]');

    const lastIndex = $('table tr').get().length;
    let docketNum = $('.layoutHeader h1').text();

    docketNum = formatDocketNum(docketNum);

    $('table').find('tr').each(async (index: number, el: CheerioElement) => {

        // if(index > 0 && index < lastIndex - 1 && index < 3) {
        if(index > 0 && index < lastIndex - 1) {

            const filing: TXFiling = {} as TXFiling;

            let itemNum;
            const itemLink = $(el).find('td > strong > a').attr('href');

            if(itemLink) {
                itemNum = $(el).find('td > strong > a').eq(0).text().trim();
                const url: URL = new URL(itemLink, baseUrl);
                await requestQueue.addRequest({
                    url: url.href
                });
            } else {
                itemNum = $(el).find('td').eq(0).text().trim();
            }

            const fileStamp = $(el).find('td').eq(1).text().trim();
            const party = $(el).find('td').eq(2).text().trim();
            const description = $(el).find('td').eq(3).text().trim();

            filing.docketID = docketNum;
            filing.filingID = itemNum;
            filing.fileStamp = fileStamp;
            filing.party = party;
            filing.filingDescription = description;
            filing.downloadLinks = [];

            if(!itemLink) {
                exportJsonObjToCSV(filing, 'TX-filings.csv');
                const dataset = await Apify.openDataset('TX-FILINGS');
                await dataset.pushData(filing);
                log.info(`[FILING DATA WITHOUT DOWNLOAD LINKS: ${JSON.stringify(filing)}`);

            }
        }
    });

    await enqueueNextPageLinks($, requestQueue);
};

/*
    Only save PDF link, exclude zip.
    Download links: array, e.g 14406-844
 */

export const handleDocs = async ($: CheerioSelector): Promise<void> => {
    // Handle doc details
    log.info('[handle docs]');
    const filing: TXFiling = {} as TXFiling;

    const caseNum = $('.layoutHeader h1').text().split('-').map((val: string) => formatDocketNum(val));
    const docketNum = caseNum[0];
    const itemNum = caseNum[1];

    const fileStamp = $('p > strong').get(0).next.data.trim();
    const filingParty = $('p > strong').get(1).next.data.trim();
    // docket description
    const caseStyle = $('p > strong').get(2).next.data.trim();
    const filingDescription = $('p > strong').get(2).next.data.trim();

    const links = [];
    $('table').find('tr').each((index: number, el: CheerioElement) => {
        const context = $(el).find('td').eq(2).text().trim();

        if(context === 'PDF' || context === 'TIF' || context === 'DOC' || context == 'DOCX') {
            links.push($(el).find('a').attr('href'));
        }
    });

    filing.docketID = docketNum;
    filing.filingID = itemNum;
    filing.fileStamp = fileStamp;
    filing.party = filingParty;
    // filing.caseStyle = caseStyle;
    filing.filingDescription = filingDescription;
    filing.downloadLinks = links;

    log.info(`[FILING DATA WITH DOWNLOAD LINKS: ${JSON.stringify(filing)}`);

    exportJsonObjToCSV(filing, 'TX-filings.csv');
    const dataset = await Apify.openDataset('TX-FILINGS');
    await dataset.pushData(filing);
    //
    const pt = openFolder(`${docketNum}/${docketNum}-${itemNum}`);
    writeJSONFileToFolder(filing, pt, `${docketNum}-${itemNum}.json`);
};

// helpers
const enqueueNextPageLinks = async ($: CheerioSelector, requestQueue: RequestQueue): Promise<void> => {
    const nextPageLink = $('.PagedList-skipToNext a').attr('href');

    if(nextPageLink) {
        const url = new URL(nextPageLink, baseUrl);
        log.info(`[${nextPageLink}]`);
        await requestQueue.addRequest({
            url: url.href
        });
    }
};
