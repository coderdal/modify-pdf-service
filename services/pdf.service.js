const {
    ServicePrincipalCredentials,
    PDFServices,
    MimeType,
    CompressPDFJob,
    CompressPDFResult,
    CompressionLevel,
    CompressPDFParams,
    ProtectPDFJob,
    ProtectPDFResult,
    ProtectPDFParams,
    RemoveProtectionJob,
    RemoveProtectionResult,
    RemoveProtectionParams,
    SplitPDFJob,
    SplitPDFResult,
    SplitPDFParams,
    ReorderPDFJob,
    ReorderPDFResult,
    ReorderPDFParams,
    ExportPDFJob,
    ExportPDFResult,
    ExportPDFParams,
    ExportPDFTargetFormat,
    ExportPDFToImagesJob,
    ExportPDFToImagesResult,
    ExportPDFToImagesParams,
    ExportPDFToImagesTargetFormat,
    ExportPDFToImagesOutputType,
    EncryptionAlgorithm,
    PageRanges,
    ReorderPagesParams,
    ReorderPagesJob,
    ReorderPagesResult
} = require("@adobe/pdfservices-node-sdk");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { TEMP_FILE_LIFETIME } = require('../constants');
const { AppError } = require('../middlewares/error.middleware');

class PdfService {
    constructor() {
        this.credentials = new ServicePrincipalCredentials({
            clientId: process.env.PDF_SERVICES_CLIENT_ID,
            clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET
        });
        this.pdfServices = new PDFServices({ credentials: this.credentials });
    }

    async uploadFile(readStream) {
        try {
            return await this.pdfServices.upload({
                readStream,
                mimeType: MimeType.PDF
            });
        } catch (error) {
            throw new AppError('Failed to upload file', 500, 'UPLOAD_FAILED');
        }
    }

    async compressPdf(pdfFile, compressionLevel) {
        let readStream;
        try {
            readStream = fs.createReadStream(pdfFile.tempFilePath);
            const inputAsset = await this.uploadFile(readStream);

            const params = new CompressPDFParams({
                compressionLevel: CompressionLevel[compressionLevel]
            });

            const job = new CompressPDFJob({ inputAsset, params });
            const pollingURL = await this.pdfServices.submit({ job });
            const pdfServicesResponse = await this.pdfServices.getJobResult({
                pollingURL,
                resultType: CompressPDFResult
            });

            return await this.processResult(pdfServicesResponse, pdfFile.name);
        } catch (error) {
            throw new AppError('Failed to compress PDF', 500, 'COMPRESSION_FAILED');
        } finally {
            readStream?.destroy();
        }
    }

    async protectPdf(pdfFile, password) {
        let readStream;
        try {
            readStream = fs.createReadStream(pdfFile.tempFilePath);
            const inputAsset = await this.uploadFile(readStream);

            const params = new ProtectPDFParams({
                userPassword: password,
                encryptionAlgorithm: EncryptionAlgorithm.AES_256
            });

            const job = new ProtectPDFJob({ inputAsset, params });
            const pollingURL = await this.pdfServices.submit({ job });
            const pdfServicesResponse = await this.pdfServices.getJobResult({
                pollingURL,
                resultType: ProtectPDFResult
            });

            return await this.processResult(pdfServicesResponse, pdfFile.name);
        } catch (error) {
            throw new AppError('Failed to protect PDF', 500, 'PROTECTION_FAILED');
        } finally {
            readStream?.destroy();
        }
    }

    async removeProtection(pdfFile, password) {
        let readStream;
        try {
            readStream = fs.createReadStream(pdfFile.tempFilePath);
            const inputAsset = await this.uploadFile(readStream);

            const params = new RemoveProtectionParams({
                password
            });

            const job = new RemoveProtectionJob({ inputAsset, params });
            const pollingURL = await this.pdfServices.submit({ job });
            const pdfServicesResponse = await this.pdfServices.getJobResult({
                pollingURL,
                resultType: RemoveProtectionResult
            });

            return await this.processResult(pdfServicesResponse, pdfFile.name);
        } catch (error) {
            throw new AppError('Failed to remove PDF protection', 500, 'REMOVE_PROTECTION_FAILED');
        } finally {
            readStream?.destroy();
        }
    }

    async splitPdf(pdfFile, fromPage, toPage) {
        let readStream;
        try {
            readStream = fs.createReadStream(pdfFile.tempFilePath);
            const inputAsset = await this.uploadFile(readStream);

            const pageRanges = new PageRanges();
            pageRanges.addRange(fromPage, toPage);

            const params = new SplitPDFParams({ pageRanges });

            const job = new SplitPDFJob({ inputAsset, params });
            const pollingURL = await this.pdfServices.submit({ job });
            const pdfServicesResponse = await this.pdfServices.getJobResult({
                pollingURL,
                resultType: SplitPDFResult
            });

            return await this.processResult(pdfServicesResponse, pdfFile.name);
        } catch (error) {
            throw new AppError('Failed to split PDF', 500, 'SPLIT_FAILED');
        } finally {
            readStream?.destroy();
        }
    }

    async reorderPdf(pdfFile, pageOrder) {
        let readStream;
        try {
            readStream = fs.createReadStream(pdfFile.tempFilePath);
            const inputAsset = await this.uploadFile(readStream);

            const pageRanges = new PageRanges();
            pageOrder.forEach(pageNum => {
                pageRanges.addSinglePage(pageNum);
            });

            const params = new ReorderPagesParams({
                asset: inputAsset,
                pageRanges
            });

            const job = new ReorderPagesJob({ params });
            const pollingURL = await this.pdfServices.submit({ job });
            const pdfServicesResponse = await this.pdfServices.getJobResult({
                pollingURL,
                resultType: ReorderPagesResult
            });

            return await this.processResult(pdfServicesResponse, pdfFile.name);
        } catch (error) {
            throw new AppError('Failed to reorder PDF', 500, 'REORDER_FAILED');
        } finally {
            readStream?.destroy();
        }
    }

    async convertPdf(pdfFile, exportFormat) {
        let readStream;
        try {
            if (!pdfFile || !pdfFile.tempFilePath) {
                throw new AppError('Invalid file upload', 400, 'INVALID_FILE');
            }

            readStream = fs.createReadStream(pdfFile.tempFilePath);
            const inputAsset = await this.uploadFile(readStream);

            const isImageFormat = ['jpeg', 'png'].includes(exportFormat.toLowerCase());
            let job, params, resultType;

            if (isImageFormat) {
                params = new ExportPDFToImagesParams({
                    targetFormat: ExportPDFToImagesTargetFormat[exportFormat.toUpperCase()],
                    outputType: ExportPDFToImagesOutputType.ZIP_OF_PAGE_IMAGES
                });
                job = new ExportPDFToImagesJob({ inputAsset, params });
                resultType = ExportPDFToImagesResult;
            } else {
                // For DOCX conversion
                params = new ExportPDFParams({
                    targetFormat: ExportPDFTargetFormat.DOCX
                });
                job = new ExportPDFJob({ inputAsset, params });
                resultType = ExportPDFResult;
            }

            const pollingURL = await this.pdfServices.submit({ job });
            const pdfServicesResponse = await this.pdfServices.getJobResult({
                pollingURL,
                resultType
            });

            if (isImageFormat) {
                const resultAsset = pdfServicesResponse.result.assets[0];
                return await this.processResult(
                    { result: { asset: resultAsset } }, 
                    pdfFile.name, 
                    'zip'
                );
            } else {
                return await this.processResult(
                    pdfServicesResponse, 
                    pdfFile.name, 
                    exportFormat.toLowerCase()
                );
            }
        } catch (error) {
            console.error('Conversion error details:', {
                error: error.message,
                stack: error.stack,
                code: error.code,
                errorCode: error.errorCode
            });
            
            if (error instanceof AppError) {
                throw error;
            }
            
            if (error.code === 'ENOENT') {
                throw new AppError('File not found or not accessible', 400, 'FILE_NOT_FOUND');
            }
            
            throw new AppError(
                'Failed to convert PDF: ' + (error.message || 'Unknown error'), 
                500, 
                'CONVERSION_FAILED'
            );
        } finally {
            if (readStream) {
                readStream.destroy();
            }
        }
    }

    async processResult(pdfServicesResponse, originalFileName, extension = 'pdf') {
        const resultAsset = pdfServicesResponse.result.assets 
            ? pdfServicesResponse.result.assets[0]
            : pdfServicesResponse.result.asset;

        const streamAsset = await this.pdfServices.getContent({ asset: resultAsset });

        const uniqueFileName = originalFileName.slice(0, -4) + '-' + crypto.randomBytes(6).toString('hex') + '.' + extension;
        const tempFilePath = path.join(__dirname, '..', 'temp', uniqueFileName);

        const outputStream = fs.createWriteStream(tempFilePath);
        streamAsset.readStream.pipe(outputStream);

        // Set cleanup timeout
        setTimeout(() => {
            fs.unlinkSync(tempFilePath);
        }, TEMP_FILE_LIFETIME);

        return uniqueFileName;
    }
}

module.exports = new PdfService(); 