const { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } = require('../constants');

const validateFileUpload = (req, res, next) => {
    try {
        const { pdf: pdfFile } = req?.files || {};
        
        if (!pdfFile) {
            return res.status(400).json({ 
                status: 'error',
                message: 'No file uploaded',
                code: 'FILE_MISSING'
            });
        }

        if (!ALLOWED_FILE_TYPES.includes(pdfFile.mimetype)) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Invalid file type',
                code: 'INVALID_FILE_TYPE'
            });
        }

        if (pdfFile.size > MAX_FILE_SIZE) {
            return res.status(400).json({ 
                status: 'error',
                message: 'File size limit has been reached',
                code: 'FILE_TOO_LARGE'
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validateFileUpload
}; 