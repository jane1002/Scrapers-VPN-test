const json2csv = require('json2csv');
const os = require('os');
const fs = require('fs');
const request = require('request');
const path = require("path");
const url = require('url');

exports.exportJsonObjToCSV = (data,  outputFile) => {
    const header = false;
    const fields = Object.keys(data);
    const opts = {fields, header};

    try {
        const parser = new json2csv.Parser(opts);
        const csv = parser.parse(data);

        fs.writeFileSync(outputFile, `${csv}${os.EOL}`, {flag: 'a'});

    } catch (err) {
        console.error(err.message);
    }
};

exports.formatDocketNum = (docketNum) => {
    if(docketNum) {
        const pattern = /[0-9]+/;
        return pattern.exec(docketNum)[0];
    } else
        return docketNum;
};

exports.openFolder = (folderName) => {

    // todo: root folder path of output result can be set through config file
    const dir = path.resolve(__dirname, '../output');
    checkAndCreateFolder(dir);

    const dirPath = path.join(dir, folderName);
    checkAndCreateFolder(dirPath);

    return dirPath;
};

exports.writeJSONFileToFolder= (obj, folderPath, fileName) => {
    const data = JSON.stringify(obj,null,"\t");
    const pt = path.join(folderPath, fileName);

//    fs.writeFile(pt,data,function(err){
//        if (err) {
//            console.log('ERROR', err.code);
//        }
//    })
    fs.writeFileSync(pt,data);
};

const checkAndCreateFolder = (dirPath) => {

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};


exports.downloadFiles = async (urls, filePath) => {

    urls.forEach(link => {
        const pathName = url.parse(link).pathname;
        const strArr = pathName.split('/');
        const fileName = strArr[strArr.length - 1];
        const savePath = path.join(filePath, fileName);

        return new Promise(function(resolve, reject) {
            const stream = fs.createWriteStream(savePath);
            request(link).pipe(stream).on('close',function(){
                console.log(fileName +' Download complete');
                resolve('Finish download');
            });

            request(link).pipe(stream).on('error',function(){
                console.log(fileName +' Download error');
                reject('Download error');
            });
        })

    })
};
