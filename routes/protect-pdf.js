var express = require('express');
var router = express.Router();
const {
    ServicePrincipalCredentials,
    PDFServices,
    MimeType,
    ProtectPDFParams,
    EncryptionAlgorithm,
    ProtectPDFJob,
    ProtectPDFResult
} = require("@adobe/pdfservices-node-sdk");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, TEMP_FILE_LIFETIME } = require('../constants');

/* POST protect-pdf page. */
router.post('/', async function(req, res, next) {
    if (!req?.files || !req?.files?.file) return res.status(400).json({ error: 'No file uploaded' });
    const { file: uploadedFile } = req?.files;
    const userPassword = req?.body?.password;
    if (!userPassword) return res.status(400).json({ error: 'Password is required' });
    let readStream;
    try {
        if (!ALLOWED_FILE_TYPES.includes(uploadedFile?.mimetype)) return res.status(400).json({ error: 'Invalid file type' });
        if (uploadedFile.size > MAX_FILE_SIZE) return res.status(400).json({ error: 'File size limit has been reached' });

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

        const params = new ProtectPDFParams({
            userPassword,
            encryptionAlgorithm: EncryptionAlgorithm.AES_256
        });

        const job = new ProtectPDFJob({ inputAsset, params });

        const pollingURL = await pdfServices.submit({ job });
        const pdfServicesResponse = await pdfServices.getJobResult({
            pollingURL,
            resultType: ProtectPDFResult
        });

        const resultAsset = pdfServicesResponse.result.asset;
        const streamAsset = await pdfServices.getContent({asset: resultAsset});

        const uniqueFileName = uploadedFile.name.slice(0,-3) + '-' + crypto.randomBytes(6).toString('hex') + '.pdf';
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
