const Apify = require('apify');
const { utils: { log } } = Apify;
const { exportJsonObjToCSV, formatDocketNum, openFolder, writeJSONFileToFolder } = require('../helpers');
const baseUrl = 'http://interchange.puc.texas.gov';

exports.handleDockets = async ($, requestQueue) => {
    // log.info('[handle docket]');
    const lastIndex = $('table tr').get().length;
    const docketInfo = {};
    const dataset = await Apify.openDataset('TX-DOCKETS');

    $('table').find('tr').each(async (index, el) => {
        // for test:
        if(index > 0 && index < 10) {
        // if(index != 0 && index < lastIndex - 1) {
            const docketNum = $(el).find('td > strong > a').eq(0).text().trim();
            let docketLink = $(el).find('td > strong > a').attr('href');

            if(docketLink) {
                docketLink = new URL(docketLink, baseUrl);
                await requestQueue.addRequest({
                    url: docketLink.href
                });
            }

            const filings = $(el).find('td').eq(1).text().trim();
            const utility = $(el).find('td').eq(2).text().trim();
            const description = $(el).find('td').eq(3).text().trim();

            docketInfo.docketNum = docketNum;
            docketInfo.filings = filings;
            docketInfo.utility = utility;
            docketInfo.description = description;
            // console.log(JSON.stringify(docketInfo));

            // export docket metadata
            exportJsonObjToCSV(docketInfo, 'TX-dockets.csv');
            await dataset.pushData(docketInfo);
            // open a folder naming it as docketID, path: output/docketID/
            const pt = openFolder(docketInfo.docketNum);
            // add docketJSON to this folder, path: output/docketID/docketID.json
            writeJSONFileToFolder(docketInfo, pt, `${docketNum}.json`);
        }
    });

    await enqueueNextPageLinks($, requestQueue);
};

/*
 edge case: filings don't have download link, e.g.15599, need to be persisted here instead of document level
 */

exports.handleFilings = async ($, requestQueue) => {
    // Handle details
    // log.info('[handle filings]');

    const lastIndex = $('table tr').get().length;
    let docketNum = $('.layoutHeader h1').text();

    docketNum = formatDocketNum(docketNum);

    $('table').find('tr').each(async (index, el) => {
        let filing = {};
        if(index > 0 && index < lastIndex - 1) {
            let itemNum;
            let itemLink = $(el).find('td > strong > a').attr('href');

            if(itemLink) {
                itemNum = $(el).find('td > strong > a').eq(0).text().trim();
                itemLink = new URL(itemLink, baseUrl);
                await requestQueue.addRequest({
                    url: itemLink.href
                });
            } else {
                itemNum = $(el).find('td').eq(0).text().trim();
            }

            const fileStamp = $(el).find('td').eq(1).text().trim();
            const party = $(el).find('td').eq(2).text().trim();
            const description = $(el).find('td').eq(3).text().trim();

            filing.docketNum = docketNum;
            filing.itemNum = itemNum;
            filing.fileStamp = fileStamp;
            filing.filingParty = party;
            filing.filingDescription = description;
            filing.links = [];

            if(!itemLink) {
                exportJsonObjToCSV(filing, 'TX-filings.csv');
                const dataset = await Apify.openDataset('TX-FILINGS');
                await dataset.pushData(filing);
                // todo:
                // find that docketID folder, add/check filing folder docketID-itemID
            }
            // console.log(JSON.stringify(fillings));

            // next page
            let nextPageLink = $('.PagedList-skipToNext a').attr('href');

            if(nextPageLink) {
                nextPageLink = new URL(nextPageLink, baseUrl);

                await requestQueue.addRequest({
                    url: nextPageLink.href
                });
            }
        }
    });

    await enqueueNextPageLinks($, requestQueue);
};

/*
    Only save PDF link, exclude zip.
    Download links: array, e.g 14406-844
 */

exports.handleDocs = async ($, requestQueue) => {
    // Handle doc details
    // log.info('[handle docs]');
    let filing = {};

    let caseNum = $('.layoutHeader h1').text();
    caseNum = caseNum.split('-');
    caseNum = caseNum.map(val => formatDocketNum(val));
    const docketNum = caseNum[0];
    const itemNum = caseNum[1];

    const fileStamp = $('p > strong').get(0).next.data.trim();
    const filingParty = $('p > strong').get(1).next.data.trim();
    // docket description
    const caseStyle = $('p > strong').get(2).next.data.trim();
    const filingDescription = $('p > strong').get(2).next.data.trim();

    let links = new Array();
    $('table').find('tr').each((index, el) => {
        const context = $(el).find('td').eq(2).text().trim();

        if(context === 'PDF') {
            links.push($(el).find('a').attr('href'));
        }
    });

    filing.docketNum = docketNum;
    filing.itemNum = itemNum;
    filing.fileStamp = fileStamp;
    filing.filingParty = filingParty;
    // filing.caseStyle = caseStyle;
    filing.filingDescription = filingDescription;
    filing.links = links;

    // console.log('filing: ', JSON.stringify(filing));
    exportJsonObjToCSV(filing, 'TX-filings.csv');
    const dataset = await Apify.openDataset('TX-FILINGS');
    await dataset.pushData(filing);
    // todo:
    // find that docketID folder, create/check filing folder docketID-itemID: path: output/docketID/docketID-itemNum/
    const pt = openFolder(`${docketNum}/${docketNum}-${itemNum}`);
    // add filing json file, path: output/docketID/docketID-itemNum/
    writeJSONFileToFolder(filing, pt, `${docketNum}-${itemNum}.json`);
    // add downloaded pdfs
};

// helpers
const enqueueNextPageLinks = async ($, requestQueue) =>{
    let nextPageLink = $('.PagedList-skipToNext a').attr('href');

    if(nextPageLink) {
        nextPageLink = new URL(nextPageLink, baseUrl);
        log.info(`[${nextPageLink}]`);
        await requestQueue.addRequest({
            url: nextPageLink.href
        });
    }
};
