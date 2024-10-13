var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fileUpload = require('express-fileupload');
const path = require('path');
const { TEMP_FILE_DIR, RESULT_FILE_DIR, MAX_FILE_SIZE } = require('./constants');

var compressPdfRouter = require('./routes/compress-pdf');
var convertPdfRouter = require('./routes/convert-pdf');
var protectPdfRouter = require('./routes/protect-pdf');
var removePdfProtectionRouter = require('./routes/remove-pdf-protection');
var app = express();

app.use("/result", express.static(path.join(__dirname, RESULT_FILE_DIR)));
app.use(fileUpload({
    limits: { fileSize: MAX_FILE_SIZE },
    useTempFiles: true,
    tempFileDir: TEMP_FILE_DIR,
    safeFileNames: true,
    uriDecodeFileNames: true,
    abortOnLimit: true,
    responseOnLimit: 'File size limit has been reached'
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/compress-pdf', compressPdfRouter);
app.use('/convert-pdf', convertPdfRouter);
app.use('/protect-pdf', protectPdfRouter);
app.use('/remove-pdf-protection', removePdfProtectionRouter);
module.exports = app;
