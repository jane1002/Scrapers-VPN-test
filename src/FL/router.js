const Apify = require('apify');

const { utils: { log } } = Apify;
const {exportJsonObjToCSV, formatDocketNum} = require('../helpers');

const baseUrl = 'http://www.psc.state.fl.us/ClerkOffice';

exports.handleStart = async ({ request, page }) => {
    // Handle Start URLs
};

exports.handleDockets = async ($, requestQueue) => {
    log.info('[handle docket]');
    // Handle pagination
    const lastIndex = $('#DataTable tbody').find('tr').length;
    console.log(lastIndex);
    const docketInfo = {};

    $('#DataTable tbody').find('tr').each(async (index, el) => {

        // if(index != 0 && index < lastIndex - 1) {
        if( index < 5) {
            const docketNum = $(el).find('td > a').eq(0).text().trim();
            let docketDetailLink = $(el).find('td > a').attr('href');
            //
            // if(docketDetailLink) {
            //     docketDetailLink = new URL(docketLink, baseUrl);
            //     await requestQueue.addRequest({
            //         url: docketDetailLink.href
            //     });
            // }

            const dateDocketed = $(el).find('td').eq(1).text().trim();
            const CASRApproved = $(el).find('td').eq(2).text().trim();
            const docketTitle = $(el).find('td').eq(3).text().trim();
            let docketFillingsLink = $(el).find('td').eq(4).children().attr('href');
            docketFillingsLink = `${baseUrl}/${docketFillingsLink}`;

            if(docketFillingsLink) {
                await requestQueue.addRequest({
                    url: docketFillingsLink
                });
            }

            docketInfo.docketNum = formatDocketNum(docketNum);
            docketInfo.dateDocketed = dateDocketed;
            docketInfo.CASRApproved = CASRApproved;
            docketInfo.docketTitle = docketTitle;

            // console.log(JSON.stringify(docketInfo));
            exportJsonObjToCSV(docketInfo, 'dockets-fl.csv');
        }
    });


    $('.gridFooter').find('a').each(async (index, el) => {
        const text = $(el).text();
        if(text === '>') {
            const path = $(el).attr('href');
            const nextPageLink = new URL(path, baseUrl);

            await requestQueue.addRequest({
                url: nextPageLink.href
            });
        }
    });
};
/*
 some filings don't have download link, 15599.
 */
exports.handleFilings = async ($, requestQueue) => {
    // Handle details
    log.info('[handle fillings]');
    // Handle pagination
    const lastIndex = $('#DataTable tbody').find('tr').length;

    const docInfo = {};

    $('#DataTable tbody').find('tr').each(async (index, el) => {

        // if(index != 0 && index < lastIndex - 1) {
        if( index < 5) {
            const documentID = $(el).find('td').eq(0).text().trim();
            const order = $(el).find('td').eq(1).text().trim();
            const dateFiled = $(el).find('td').eq(2).text().trim();
            const description = $(el).find('td').eq(3).text().trim();

            let downloadLink = $(el).find('td').eq(4).children().attr('href');
            downloadLink = `${baseUrl}/${downloadLink}`;

            docInfo.documentID = documentID;
            docInfo.order = order;
            docInfo.dateFiled = dateFiled;
            docInfo.description = description;

            // console.log(JSON.stringify(docInfo));
            exportJsonObjToCSV(docInfo, 'docs-fl.csv');
        }
    });

    // todo; next page?
};

exports.handleDocs = async ($, requestQueue) => {
    // Handle doc details
    log.info('[handle docs]');
};

