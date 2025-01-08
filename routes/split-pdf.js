const express = require('express');
const router = express.Router();
const {
    ServicePrincipalCredentials,
    PDFServices,
    MimeType,
    SplitPDFParams,
    SplitPDFJob,
    SplitPDFResult,
    PageRanges
} = require("@adobe/pdfservices-node-sdk");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MAX_FILE_SIZE, ALLOWED_FILE_TYPES, TEMP_FILE_LIFETIME } = require('../constants');

router.post('/', async function(req, res, next) {
    if (!req?.files || !req?.files?.file) return res.status(400).json({ error: 'No file uploaded' });
    const { file: uploadedFile } = req?.files;
    let readStream;

    const fromPage = parseInt(req.body.fromPage);
    const toPage = parseInt(req.body.toPage);

    if (!fromPage || !toPage || fromPage > toPage) {
        return res.status(400).json({ error: 'Invalid page range' });
    }

    try {
        if (!ALLOWED_FILE_TYPES.includes(uploadedFile?.mimetype)) 
            return res.status(400).json({ error: 'Invalid file type' });
        if (uploadedFile.size > MAX_FILE_SIZE) 
            return res.status(400).json({ error: 'File size limit has been reached' });

        const credentials = new ServicePrincipalCredentials({
            clientId: process.env.PDF_SERVICES_CLIENT_ID,
            clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET
        });

        const pdfServices = new PDFServices({ credentials });

        readStream = fs.createReadStream(uploadedFile.tempFilePath);
        const inputAsset = await pdfServices.upload({
            readStream,
            mimeType: MimeType.PDF
        });

        const pageRanges = new PageRanges();
        pageRanges.addRange(fromPage, toPage);
        const params = new SplitPDFParams({ pageRanges });

        const job = new SplitPDFJob({ inputAsset, params });
        const pollingURL = await pdfServices.submit({ job });
        const pdfServicesResponse = await pdfServices.getJobResult({
            pollingURL,
            resultType: SplitPDFResult
        });

        const resultAsset = pdfServicesResponse.result.assets[0]; // We only need the first asset
        const streamAsset = await pdfServices.getContent({ asset: resultAsset });

        const uniqueFileName = uploadedFile.name.slice(0,-4) + '-' + crypto.randomBytes(6).toString('hex') + '.pdf';
        const outputPath = path.join(__dirname, '..', 'temp', uniqueFileName);
        
        const writeStream = fs.createWriteStream(outputPath);
        streamAsset.readStream.pipe(writeStream);

        const filePath = `${req.protocol}://${req.get('host')}/result/${uniqueFileName}`;

        // Cleanup
        setTimeout(() => {
            fs.unlinkSync(outputPath);
        }, TEMP_FILE_LIFETIME);

        res.status(200).json({ filePath });
    } catch (err) {
        console.log("Exception encountered while executing operation", err);
        return res.status(500).json({ error: "An error occurred while processing your request" });
    } finally {
        readStream?.destroy();
    }
});

module.exports = router; 