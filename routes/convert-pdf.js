const express = require('express');
const router = express.Router();
const { validateFileUpload } = require('../middlewares/fileUpload.middleware');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { convertPdfSchema } = require('../validators/pdf.validator');
const pdfService = require('../services/pdf.service');

router.post('/', 
    validateFileUpload,
    asyncHandler(async (req, res) => {
        const { error, value } = convertPdfSchema.validate(req.body);
        if (error) {
            throw new AppError(
                error.details[0].message,
                400,
                'VALIDATION_ERROR'
            );
        }

        if (!req.files?.pdf) {
            throw new AppError(
                'No PDF file uploaded',
                400,
                'FILE_MISSING'
            );
        }

        try {
            const uniqueFileName = await pdfService.convertPdf(req.files.pdf, value.exportFormat);
            const filePath = `${req.protocol}://${req.get('host')}/result/${uniqueFileName}`;

            res.status(200).json({ 
                status: 'success',
                data: {
                    filePath,
                    originalName: req.files.pdf.name,
                    exportFormat: value.exportFormat,
                    extension: value.exportFormat.toLowerCase() === 'docx' ? 'docx' : 'zip'
                }
            });
        } catch (error) {
            throw error;
        }
    })
);

module.exports = router;
