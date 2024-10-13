var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fileUpload = require('express-fileupload');
const path = require('path');

var compressPdfRouter = require('./routes/compress-pdf');
var app = express();

app.use("/result", express.static(path.join(__dirname, 'temp')));
app.use(fileUpload({
    limits: { fileSize: 20 * 1024 * 1024 },
    useTempFiles: true,
    tempFileDir: '/tmp/',
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

module.exports = app;
