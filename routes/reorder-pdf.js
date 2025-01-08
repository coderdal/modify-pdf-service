const express = require('express');
const router = express.Router();
const {
    ServicePrincipalCredentials,
    PDFServices,
    MimeType,
    PageRanges,
    ReorderPagesParams,
    ReorderPagesJob,
    ReorderPagesResult
} = require("@adobe/pdfservices-node-sdk");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MAX_FILE_SIZE, ALLOWED_FILE_TYPES, TEMP_FILE_LIFETIME } = require('../constants');

router.post('/', async function(req, res, next) {
    if (!req?.files || !req?.files?.file) return res.status(400).json({ error: 'No file uploaded' });
    const { file: uploadedFile } = req?.files;
    let readStream;

    try {
        // Parse the page order from the form data
        const pageOrder = JSON.parse(req.body.pageOrder);
        
        if (!Array.isArray(pageOrder) || pageOrder.length === 0) {
            return res.status(400).json({ error: 'Invalid page order format' });
        }

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

        // Create page ranges for reordering
        const pageRanges = new PageRanges();
        pageOrder.forEach(pageNum => {
            pageRanges.addSinglePage(parseInt(pageNum));
        });

        const params = new ReorderPagesParams({
            asset: inputAsset,
            pageRanges: pageRanges
        });

        const job = new ReorderPagesJob({ params });
        const pollingURL = await pdfServices.submit({ job });
        const pdfServicesResponse = await pdfServices.getJobResult({
            pollingURL,
            resultType: ReorderPagesResult
        });

        const resultAsset = pdfServicesResponse.result.asset;
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
        if (err instanceof SyntaxError) {
            return res.status(400).json({ error: "Invalid page order format" });
        }
        return res.status(500).json({ error: "An error occurred while processing your request" });
    } finally {
        readStream?.destroy();
    }
});

module.exports = router; 