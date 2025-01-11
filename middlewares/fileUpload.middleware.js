const fileUpload = require('express-fileupload');
const { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } = require('../constants');
const { AppError } = require('./error.middleware');

const validateFileUpload = (req, res, next) => {
    try {
        const { pdf: pdfFile } = req?.files || {};
        
        if (!pdfFile) {
            throw new AppError(
                'No file uploaded. Please select a PDF file.',
                400,
                'FILE_MISSING'
            );
        }

        if (!ALLOWED_FILE_TYPES.includes(pdfFile.mimetype)) {
            throw new AppError(
                'Invalid file type. Please upload a PDF file.',
                400,
                'INVALID_FILE_TYPE'
            );
        }

        if (pdfFile.size > MAX_FILE_SIZE) {
            const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
            throw new AppError(
                `File size exceeds the ${maxSizeMB}MB limit. Please upload a smaller file.`,
                400,
                'FILE_TOO_LARGE'
            );
        }

        if (!pdfFile.tempFilePath || !pdfFile.name) {
            throw new AppError(
                'Invalid file upload. Please try again.',
                400,
                'INVALID_UPLOAD'
            );
        }

        next();
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else {
            next(new AppError(
                'File upload failed. Please try again.',
                500,
                'UPLOAD_FAILED'
            ));
        }
    }
};

module.exports = {
    validateFileUpload
}; 