var express = require('express');
var router = express.Router();
const {
    ServicePrincipalCredentials,
    PDFServices,
    MimeType,
    ExportPDFJob,
    ExportPDFParams,
    ExportPDFTargetFormat,
    ExportPDFResult,
    ExportPDFToImagesOutputType,
    ExportPDFToImagesTargetFormat,
    ExportPDFToImagesJob,
    ExportPDFToImagesResult,
    ExportPDFToImagesParams
} = require("@adobe/pdfservices-node-sdk");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { INPUT_FORMATS, EXPORT_FORMATS, ALLOWED_FILE_TYPES, MAX_FILE_SIZE, TEMP_FILE_LIFETIME } = require('../constants');

/* POST convert-pdf page. */
router.post('/', async function(req, res, next) {
    if (!req?.files || !req?.files?.file) return res.status(400).json({ error: 'No file uploaded' });
    const { file: uploadedFile } = req?.files;
    let readStream;
    const reqInputFormat = req?.body?.inputFormat?.toLowerCase();
    const reqExportFormat = req?.body?.exportFormat?.toLowerCase();
    if ((!reqExportFormat || !Object.keys(EXPORT_FORMATS).includes(reqExportFormat)) || (!reqInputFormat || !Object.keys(INPUT_FORMATS).includes(reqInputFormat))) return res.status(400).json({ error: 'Invalid conversion format' });
    const inputFormat = INPUT_FORMATS[reqInputFormat];
    const exportFormat = EXPORT_FORMATS[reqExportFormat];
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
            mimeType: MimeType[inputFormat]
        });

        const isExportPDFToImages = exportFormat === 'JPEG' || exportFormat === 'PNG';

        let params;
        let job;
        if (isExportPDFToImages) {
            params = new ExportPDFToImagesParams({
                targetFormat: ExportPDFToImagesTargetFormat[exportFormat],
                outputType: ExportPDFToImagesOutputType.ZIP_OF_PAGE_IMAGES
            });
            job = new ExportPDFToImagesJob({ inputAsset, params });
        } else {
            params = new ExportPDFParams({
                targetFormat: ExportPDFTargetFormat[exportFormat]
            });
            job = new ExportPDFJob({ inputAsset, params });
        }

        const pollingURL = await pdfServices.submit({ job });
        const pdfServicesResponse = await pdfServices.getJobResult({
            pollingURL,
            ...(isExportPDFToImages) && { resultType: ExportPDFToImagesResult },
            ...(!isExportPDFToImages) && { resultType: ExportPDFResult }
        });

        let resultAsset, streamAsset;
        if (isExportPDFToImages) {
            resultAsset = pdfServicesResponse.result.assets;
            streamAsset = await pdfServices.getContent({ asset: resultAsset[0] });
        } else {
            resultAsset = pdfServicesResponse.result.asset;
            streamAsset = await pdfServices.getContent({ asset: resultAsset });
        }

        const exportFormatExtension = isExportPDFToImages ? 'zip' : reqExportFormat;

        const uniqueFileName = uploadedFile.name.slice(0,-3) + '-' + crypto.randomBytes(6).toString('hex') + `.${exportFormatExtension}`;
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
