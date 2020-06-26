const { openFolder, writeJSONFileToFolder } = require( './helpers');

const querystring = require("querystring");
require('dotenv').config();
const moment = require('moment');
const fs = require('fs');
const path = require("path");
const  request = require('request');

const baseUrl = 'http://interchange.puc.texas.gov';
let qs = {
    'UtilityType': 'E',
    'ControlNumber': '',
    'ItemMatch': 1,
    'ItemNumber': '',
    'UtilityName': '',
    'FilingParty': '',
    'DocumentType': 'ALL',
    'DateFiledFrom': '2017-06-01',
    'DateFiledTo': '2020-06-01',
    'Description': '',
    'FilingDescription': ''
};

qs = querystring.stringify(qs);
const url = `${baseUrl}/Search/Search?${qs}`;
console.log(url);

// let docketNum = 'Case 49779';
// let docketNum = 'Filings for 11281';
// let docketNum = '20180113-U';
let docketNum = 'http://docs.cpuc.ca.gov/SearchRes.aspx?DocFormat=ALL&DocID=339545412';
const pattern = /[0-9]+/;
docketNum = pattern.exec(docketNum);
console.log(docketNum);

const ELECTRIC_SUFFIX = ['EC', 'EI', 'EG', 'EU'];

console.log( ELECTRIC_SUFFIX.some((item) => {
    return docketNum.indexOf(item) > -1;
}));

const getDateFromEnv = (datePattern, dateFromEnv) => {
    const currentTime = dateFormatter(datePattern);
    console.log('cur', currentTime);
    const date = dateFromEnv ? dateFormatter(datePattern, dateFromEnv):  currentTime;
    console.log('env date', dateFormatter(datePattern, dateFromEnv));
    return date;
};

const dateFormatter = (pattern, dateVal) => {
    if(!dateVal)
        return moment(Date.now()).format(pattern);
    else
        return moment(dateVal).format(pattern);

    // return format(new Date(dateVal), pattern);
};

const result  = getDateFromEnv('MM/DD/YYYY', process.env.FROM_DATE);
console.log(result);


/*
function downloadFile(uri,path,callback){
    const stream = fs.createWriteStream(path);
    request(uri).pipe(stream).on('close', callback);
}

const fileUrl  = 'http://interchange.puc.texas.gov/Documents/50410_161_1071866.PDF';
const filename = '50410_161_1071866.PDF';

const dirPath = path.join(__dirname, "TX_filings");
if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
    console.log("Folder is created");
} else {
    console.log("Folder is existed");
}

const storePath = path.join(dirPath, filename);
downloadFile(fileUrl,storePath,function(){
    console.log(filename +' Download complete');
});*/


const re = openFolder('11281');

const obj = {
    ID : 11281,
    description: 'ONCOR ELECTRIC DELIVERY COMPANY, LLC","INTEREST-RATE SAVINGS COMPLIANCE FILING OF ONCOR ELECTRIC DELIVERY COMPANY, LLC RESULTING FROM DOCKET NO. 48929'
};

writeJSONFileToFolder(obj, re, '11281.json');

console.log(re);
