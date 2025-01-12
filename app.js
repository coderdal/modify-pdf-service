var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fileUpload = require('express-fileupload');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { TEMP_FILE_DIR, RESULT_FILE_DIR, MAX_FILE_SIZE } = require('./constants');
const { errorHandler } = require('./middlewares/error.middleware');

var compressPdfRouter = require('./routes/compress-pdf');
var convertPdfRouter = require('./routes/convert-pdf');
var protectPdfRouter = require('./routes/protect-pdf');
var removePdfProtectionRouter = require('./routes/remove-pdf-protection');
var splitPdfRouter = require('./routes/split-pdf');
var reorderPdfRouter = require('./routes/reorder-pdf');
var ocrPdfRouter = require('./routes/ocr-pdf');
var app = express();

app.use(cors({
    origin: '*'
}));
app.use(fileUpload({
    limits: { fileSize: MAX_FILE_SIZE },
    useTempFiles: true,
    tempFileDir: TEMP_FILE_DIR,
    safeFileNames: true,
    uriDecodeFileNames: true,
    abortOnLimit: true,
    responseOnLimit: 'File size limit has been reached'
}));
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/compress-pdf', compressPdfRouter);
app.use('/convert-pdf', convertPdfRouter);
app.use('/protect-pdf', protectPdfRouter);
app.use('/remove-pdf-protection', removePdfProtectionRouter);
app.use('/split-pdf', splitPdfRouter);
app.use('/reorder-pdf', reorderPdfRouter);
app.use('/ocr-pdf', ocrPdfRouter);

app.get("/result/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, RESULT_FILE_DIR, filename);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send('File not found');
        }

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', fs.statSync(filePath).size);
        res.download(filePath, (err) => {
            if (err) {
                res.status(404).send('File not found');
            }
        });
    });
});

// Error handling middleware should be registered last
app.use(errorHandler);

module.exports = app;
