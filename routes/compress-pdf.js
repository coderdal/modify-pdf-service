const express = require('express');
const router = express.Router();
const { validateFileUpload } = require('../middlewares/fileUpload.middleware');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { compressPdfSchema } = require('../validators/pdf.validator');
const pdfService = require('../services/pdf.service');

router.post('/', 
    validateFileUpload,
    asyncHandler(async (req, res) => {
        // Validate request body
        const { error, value } = compressPdfSchema.validate(req.body);
        if (error) {
            throw new AppError(
                error.details[0].message,
                400,
                'VALIDATION_ERROR'
            );
        }

        // Validate file presence (should be handled by validateFileUpload middleware, but double-check)
        if (!req.files?.pdf) {
            throw new AppError(
                'No PDF file uploaded',
                400,
                'FILE_MISSING'
            );
        }

        try {
            const uniqueFileName = await pdfService.compressPdf(req.files.pdf, value.compressionLevel);
            const filePath = `${req.protocol}://${req.get('host')}/result/${uniqueFileName}`;

            res.status(200).json({ 
                status: 'success',
                data: {
                    filePath,
                    originalName: req.files.pdf.name,
                    compressionLevel: value.compressionLevel
                }
            });
        } catch (error) {
            // Let the error handler middleware handle the error
            throw error;
        }
    })
);

module.exports = router;
