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
const { PDFDocument } = require('pdf-lib');

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
            if (!pdfFile || !pdfFile.tempFilePath) {
                throw new AppError('Invalid file upload', 400, 'INVALID_FILE');
            }

            readStream = fs.createReadStream(pdfFile.tempFilePath);
            let inputAsset;
            try {
                inputAsset = await this.uploadFile(readStream);
            } catch (uploadError) {
                if (uploadError.message?.includes('network')) {
                    throw new AppError('Network error while uploading file. Please try again.', 500, 'NETWORK_ERROR');
                }
                throw uploadError;
            }

            const params = new CompressPDFParams({
                compressionLevel: CompressionLevel[compressionLevel]
            });

            const job = new CompressPDFJob({ inputAsset, params });
            let pollingURL;
            try {
                pollingURL = await this.pdfServices.submit({ job });
            } catch (submitError) {
                if (submitError.message?.includes('quota')) {
                    throw new AppError('Service quota exceeded. Please try again later.', 429, 'QUOTA_EXCEEDED');
                }
                if (submitError.message?.includes('auth')) {
                    throw new AppError('Authentication failed. Please contact support.', 401, 'AUTH_FAILED');
                }
                throw submitError;
            }

            let pdfServicesResponse;
            try {
                pdfServicesResponse = await this.pdfServices.getJobResult({
                    pollingURL,
                    resultType: CompressPDFResult
                });
            } catch (processError) {
                if (processError.message?.includes('timeout')) {
                    throw new AppError('Operation timed out. Please try again.', 408, 'OPERATION_TIMEOUT');
                }
                if (processError.message?.includes('corrupt') || processError.message?.includes('invalid')) {
                    throw new AppError('The PDF file is corrupted or invalid', 400, 'INVALID_PDF');
                }
                throw processError;
            }

            return await this.processResult(pdfServicesResponse, pdfFile.name);
        } catch (error) {
            console.error('PDF compression error:', {
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

            if (error.message?.includes('compressionLevel')) {
                throw new AppError('Invalid compression level specified', 400, 'INVALID_COMPRESSION_LEVEL');
            }

            if (error.message?.includes('file size')) {
                throw new AppError('File size exceeds the maximum limit', 400, 'FILE_TOO_LARGE');
            }

            if (error.message?.includes('memory')) {
                throw new AppError('Server is busy. Please try again later.', 503, 'SERVER_BUSY');
            }

            throw new AppError(
                'Failed to compress PDF. Please try again later.',
                500,
                'COMPRESSION_FAILED'
            );
        } finally {
            readStream?.destroy();
        }
    }

    async protectPdf(pdfFile, password) {
        let readStream;
        try {
            if (!pdfFile || !pdfFile.tempFilePath) {
                throw new AppError('Invalid file upload', 400, 'INVALID_FILE');
            }

            readStream = fs.createReadStream(pdfFile.tempFilePath);
            let inputAsset;
            try {
                inputAsset = await this.uploadFile(readStream);
            } catch (uploadError) {
                if (uploadError.message?.includes('network')) {
                    throw new AppError('Network error while uploading file. Please try again.', 500, 'NETWORK_ERROR');
                }
                throw uploadError;
            }

            try {
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
            } catch (protectionError) {
                console.error('PDF protection error:', {
                    error: protectionError.message,
                    stack: protectionError.stack,
                    code: protectionError.code,
                    errorCode: protectionError.errorCode
                });

                if (protectionError.message?.includes('quota')) {
                    throw new AppError('Service quota exceeded. Please try again later.', 429, 'QUOTA_EXCEEDED');
                }

                if (protectionError.message?.includes('timeout')) {
                    throw new AppError('Operation timed out. Please try again.', 408, 'OPERATION_TIMEOUT');
                }

                if (protectionError.message?.includes('corrupt') || protectionError.message?.includes('invalid')) {
                    throw new AppError('The PDF file is corrupted or invalid', 400, 'INVALID_PDF');
                }

                if (protectionError.message?.includes('already protected') || protectionError.message?.includes('encrypted')) {
                    throw new AppError('The PDF is already password protected', 400, 'ALREADY_PROTECTED');
                }

                if (protectionError.message?.includes('password')) {
                    throw new AppError('Invalid password format', 400, 'INVALID_PASSWORD');
                }

                throw new AppError(
                    'Failed to protect PDF. Please try again later.',
                    500,
                    'PROTECTION_FAILED'
                );
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            if (error.code === 'ENOENT') {
                throw new AppError('File not found or not accessible', 400, 'FILE_NOT_FOUND');
            }

            throw new AppError(
                'Failed to process PDF. Please try again later.',
                500,
                'PROCESSING_FAILED'
            );
        } finally {
            readStream?.destroy();
        }
    }

    async removeProtection(pdfFile, password) {
        let readStream;
        try {
            if (!pdfFile || !pdfFile.tempFilePath) {
                throw new AppError('Invalid file upload', 400, 'INVALID_FILE');
            }

            readStream = fs.createReadStream(pdfFile.tempFilePath);
            let inputAsset;
            try {
                inputAsset = await this.uploadFile(readStream);
            } catch (uploadError) {
                if (uploadError.message?.includes('network')) {
                    throw new AppError('Network error while uploading file. Please try again.', 500, 'NETWORK_ERROR');
                }
                throw uploadError;
            }

            try {
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
            } catch (removeProtectionError) {
                console.error('PDF remove protection error:', {
                    error: removeProtectionError.message,
                    stack: removeProtectionError.stack,
                    code: removeProtectionError.code,
                    errorCode: removeProtectionError.errorCode
                });

                if (removeProtectionError.message?.includes('quota')) {
                    throw new AppError('Service quota exceeded. Please try again later.', 429, 'QUOTA_EXCEEDED');
                }

                if (removeProtectionError.message?.includes('timeout')) {
                    throw new AppError('Operation timed out. Please try again.', 408, 'OPERATION_TIMEOUT');
                }

                if (removeProtectionError.message?.includes('corrupt') || removeProtectionError.message?.includes('invalid')) {
                    throw new AppError('The PDF file is corrupted or invalid', 400, 'INVALID_PDF');
                }

                if (removeProtectionError.message?.includes('not protected') || removeProtectionError.message?.includes('no password')) {
                    throw new AppError('This PDF is not password protected', 400, 'NOT_PROTECTED');
                }

                if (removeProtectionError.message?.includes('incorrect password') || removeProtectionError.message?.includes('wrong password')) {
                    throw new AppError('Incorrect password. Please try again.', 401, 'INCORRECT_PASSWORD');
                }

                throw new AppError(
                    'Failed to remove PDF protection. Please try again later.',
                    500,
                    'REMOVE_PROTECTION_FAILED'
                );
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            if (error.code === 'ENOENT') {
                throw new AppError('File not found or not accessible', 400, 'FILE_NOT_FOUND');
            }

            throw new AppError(
                'Failed to process PDF. Please try again later.',
                500,
                'PROCESSING_FAILED'
            );
        } finally {
            readStream?.destroy();
        }
    }

    async splitPdf(pdfFile, fromPage, toPage) {
        let readStream;
        try {
            if (!pdfFile || !pdfFile.tempFilePath) {
                throw new AppError('Invalid file upload', 400, 'INVALID_FILE');
            }

            readStream = fs.createReadStream(pdfFile.tempFilePath);
            let inputAsset;
            try {
                inputAsset = await this.uploadFile(readStream);
            } catch (uploadError) {
                if (uploadError.message?.includes('network')) {
                    throw new AppError('Network error while uploading file. Please try again.', 500, 'NETWORK_ERROR');
                }
                throw uploadError;
            }

            try {
                // Validate page numbers
                const totalPages = await this.getPageCount(pdfFile.tempFilePath);
                
                if (fromPage > totalPages || toPage > totalPages) {
                    throw new AppError(
                        `Invalid page range. The PDF has ${totalPages} pages, but pages ${fromPage}-${toPage} were requested.`,
                        400,
                        'INVALID_PAGE_RANGE'
                    );
                }

                if (fromPage > toPage) {
                    throw new AppError(
                        'Start page cannot be greater than end page',
                        400,
                        'INVALID_PAGE_ORDER'
                    );
                }

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
            } catch (splitError) {
                console.error('PDF split error:', {
                    error: splitError.message,
                    stack: splitError.stack,
                    code: splitError.code,
                    errorCode: splitError.errorCode
                });

                if (splitError.message?.includes('quota')) {
                    throw new AppError('Service quota exceeded. Please try again later.', 429, 'QUOTA_EXCEEDED');
                }

                if (splitError.message?.includes('timeout')) {
                    throw new AppError('Operation timed out. Please try again.', 408, 'OPERATION_TIMEOUT');
                }

                if (splitError.message?.includes('corrupt') || splitError.message?.includes('invalid')) {
                    throw new AppError('The PDF file is corrupted or invalid', 400, 'INVALID_PDF');
                }

                if (splitError.message?.includes('password') || splitError.message?.includes('protected')) {
                    throw new AppError('Cannot split password-protected PDF. Please remove protection first.', 400, 'PDF_PROTECTED');
                }

                if (splitError.message?.includes('page') || splitError.message?.includes('range')) {
                    throw new AppError('Invalid page range specified', 400, 'INVALID_PAGE_RANGE');
                }

                throw new AppError(
                    'Failed to split PDF. Please try again later.',
                    500,
                    'SPLIT_FAILED'
                );
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            if (error.code === 'ENOENT') {
                throw new AppError('File not found or not accessible', 400, 'FILE_NOT_FOUND');
            }

            throw new AppError(
                'Failed to process PDF. Please try again later.',
                500,
                'PROCESSING_FAILED'
            );
        } finally {
            readStream?.destroy();
        }
    }

    async reorderPdf(pdfFile, pageOrder) {
        let readStream;
        try {
            if (!pdfFile || !pdfFile.tempFilePath) {
                throw new AppError('Invalid file upload', 400, 'INVALID_FILE');
            }
            console.log(pdfFile);
            console.log(pdfFile.tempFilePath);
            
            readStream = fs.createReadStream(pdfFile.tempFilePath);
            let inputAsset;
            try {
                inputAsset = await this.uploadFile(readStream);
            } catch (uploadError) {
                if (uploadError.message?.includes('network')) {
                    throw new AppError('Network error while uploading file. Please try again.', 500, 'NETWORK_ERROR');
                }
                throw uploadError;
            }

            try {
                const pageRanges = new PageRanges();
                const pages = pageOrder.split(',').map(Number);
                
                // Validate page numbers
                const maxPage = Math.max(...pages);
                const totalPages = await this.getPageCount(pdfFile.tempFilePath);
                
                if (maxPage > totalPages) {
                    throw new AppError(
                        `Invalid page number. The PDF has ${totalPages} pages, but page ${maxPage} was requested.`,
                        400,
                        'INVALID_PAGE_NUMBER'
                    );
                }

                // Add pages in the specified order
                pages.forEach(page => pageRanges.addSinglePage(page));

                const params = new ReorderPagesParams({
                    asset: inputAsset,
                    pageRanges
                });

                const job = new ReorderPagesJob({ inputAsset, params });
                const pollingURL = await this.pdfServices.submit({ job });
                const pdfServicesResponse = await this.pdfServices.getJobResult({
                    pollingURL,
                    resultType: ReorderPagesResult
                });

                return await this.processResult(pdfServicesResponse, pdfFile.name);
            } catch (reorderError) {
                console.error('PDF reorder error:', {
                    error: reorderError.message,
                    stack: reorderError.stack,
                    code: reorderError.code,
                    errorCode: reorderError.errorCode
                });

                if (reorderError.message?.includes('quota')) {
                    throw new AppError('Service quota exceeded. Please try again later.', 429, 'QUOTA_EXCEEDED');
                }

                if (reorderError.message?.includes('timeout')) {
                    throw new AppError('Operation timed out. Please try again.', 408, 'OPERATION_TIMEOUT');
                }

                if (reorderError.message?.includes('corrupt') || reorderError.message?.includes('invalid')) {
                    throw new AppError('The PDF file is corrupted or invalid', 400, 'INVALID_PDF');
                }

                if (reorderError.message?.includes('password') || reorderError.message?.includes('protected')) {
                    throw new AppError('Cannot reorder pages in a password-protected PDF. Please remove protection first.', 400, 'PDF_PROTECTED');
                }

                if (reorderError.message?.includes('page') || reorderError.message?.includes('range')) {
                    throw new AppError('Invalid page range specified', 400, 'INVALID_PAGE_RANGE');
                }

                throw new AppError(
                    'Failed to reorder PDF pages. Please try again later.',
                    500,
                    'REORDER_FAILED'
                );
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            if (error.code === 'ENOENT') {
                throw new AppError('File not found or not accessible', 400, 'FILE_NOT_FOUND');
            }

            throw new AppError(
                'Failed to process PDF. Please try again later.',
                500,
                'PROCESSING_FAILED'
            );
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
            let inputAsset;
            try {
                inputAsset = await this.uploadFile(readStream);
            } catch (uploadError) {
                if (uploadError.message?.includes('network')) {
                    throw new AppError('Network error while uploading file. Please try again.', 500, 'NETWORK_ERROR');
                }
                throw uploadError;
            }

            const isImageFormat = ['jpeg', 'png'].includes(exportFormat.toLowerCase());
            let job, params, resultType;

            try {
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
            } catch (conversionError) {
                console.error('Conversion error details:', {
                    error: conversionError.message,
                    stack: conversionError.stack,
                    code: conversionError.code,
                    errorCode: conversionError.errorCode
                });

                if (conversionError.message?.includes('quota')) {
                    throw new AppError('Service quota exceeded. Please try again later.', 429, 'QUOTA_EXCEEDED');
                }

                if (conversionError.message?.includes('timeout')) {
                    throw new AppError('Operation timed out. Please try again.', 408, 'OPERATION_TIMEOUT');
                }

                if (conversionError.message?.includes('corrupt') || conversionError.message?.includes('invalid')) {
                    throw new AppError('The PDF file is corrupted or invalid', 400, 'INVALID_PDF');
                }

                if (conversionError.message?.includes('password') || conversionError.message?.includes('protected')) {
                    throw new AppError('Cannot convert password-protected PDF. Please remove protection first.', 400, 'PDF_PROTECTED');
                }

                if (conversionError.message?.includes('format')) {
                    throw new AppError('Invalid export format specified', 400, 'INVALID_FORMAT');
                }

                throw new AppError(
                    'Failed to convert PDF. Please try again later.',
                    500,
                    'CONVERSION_FAILED'
                );
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            if (error.code === 'ENOENT') {
                throw new AppError('File not found or not accessible', 400, 'FILE_NOT_FOUND');
            }

            throw new AppError(
                'Failed to process PDF. Please try again later.',
                500,
                'PROCESSING_FAILED'
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

    async getPageCount(filePath) {
        const fileBuffer = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(fileBuffer);
        return pdfDoc.getPageCount();
    }
}

module.exports = new PdfService(); 