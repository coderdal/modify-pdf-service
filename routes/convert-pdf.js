const express = require('express');
const router = express.Router();
const { validateFileUpload } = require('../middlewares/fileUpload.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { convertPdfSchema } = require('../validators/pdf.validator');
const pdfService = require('../services/pdf.service');

router.post('/', 
    validateFileUpload,
    asyncHandler(async (req, res) => {
        // Validate the file is present
        if (!req.files || !req.files.pdf) {
            return res.status(400).json({
                status: 'error',
                message: 'No PDF file uploaded',
                code: 'FILE_MISSING'
            });
        }

        // Validate the body parameters
        const { error, value } = convertPdfSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                status: 'error',
                message: error.details[0].message,
                code: 'VALIDATION_ERROR'
            });
        }

        try {
            const uniqueFileName = await pdfService.convertPdf(req.files.pdf, value.exportFormat);
            const filePath = `${req.protocol}://${req.get('host')}/result/${uniqueFileName}`;

            res.status(200).json({ 
                status: 'success',
                data: {
                    filePath
                }
            });
        } catch (error) {
            // Log the error for debugging
            console.error('PDF conversion error:', error);
            
            // Send appropriate error response
            res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to convert PDF',
                code: error.errorCode || 'CONVERSION_FAILED'
            });
        }
    })
);

module.exports = router;
