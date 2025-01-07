var express = require('express');
var router = express.Router();
const {
    ServicePrincipalCredentials,
    PDFServices,
    MimeType,
    CompressPDFJob,
    CompressPDFResult,
    CompressionLevel,
    CompressPDFParams
} = require("@adobe/pdfservices-node-sdk");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MAX_FILE_SIZE, ALLOWED_FILE_TYPES, TEMP_FILE_LIFETIME, COMPRESSION_LEVELS } = require('../constants');

/* POST compress-pdf page. */
router.post('/', async function(req, res, next) {
    let readStream;
    try {
        const { pdf: pdfFile } = req?.files;
        let compressionLevel = req?.body?.compressionLevel;
        if (!pdfFile) return res.status(400).json({ error: 'No file uploaded' });
        if (!ALLOWED_FILE_TYPES.includes(pdfFile.mimetype)) return res.status(400).json({ error: 'Invalid file type' });
        if (pdfFile.size > MAX_FILE_SIZE) return res.status(400).json({ error: 'File size limit has been reached' });
        if (!COMPRESSION_LEVELS.includes(compressionLevel)) {
            compressionLevel = "HIGH"
        }

        const credentials = new ServicePrincipalCredentials({
            clientId: process.env.PDF_SERVICES_CLIENT_ID,
            clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET
        });

        const pdfServices = new PDFServices({ credentials });

        readStream = fs.createReadStream(pdfFile.tempFilePath);
        const inputAsset = await pdfServices.upload({
            readStream,
            mimeType: MimeType.PDF
        });

        const params = new CompressPDFParams({
            compressionLevel: CompressionLevel[compressionLevel]
        });

        const job = new CompressPDFJob({ inputAsset, params });

        const pollingURL = await pdfServices.submit({ job });
        const pdfServicesResponse = await pdfServices.getJobResult({
            pollingURL,
            resultType: CompressPDFResult
        });

        const resultAsset = pdfServicesResponse.result.asset;
        const streamAsset = await pdfServices.getContent({ asset: resultAsset });

        const uniqueFileName = pdfFile.name.slice(0,-3) + '-' + crypto.randomBytes(6).toString('hex') + '.pdf';
        const tempFilePath = path.join(__dirname, '..', 'temp', uniqueFileName);

        const outputStream = fs.createWriteStream(tempFilePath);
        streamAsset.readStream.pipe(outputStream);

        const filePath = `${req.protocol}://${req.get('host')}/result/${uniqueFileName}`;

        setTimeout(() => {
            fs.unlinkSync(tempFilePath);
        }, TEMP_FILE_LIFETIME);

        res.status(200).json({ filePath: filePath });
    } catch (err) {
        console.log("Exception encountered while executing operation", err);
        return res.status(500).json({ error: "An error occurred while processing your request" });
    } finally {
        readStream?.destroy();
    }
});

module.exports = router;
