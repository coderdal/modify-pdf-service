const express = require('express');
const router = express.Router();
const { validateFileUpload } = require('../middlewares/fileUpload.middleware');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { validateSchema } = require('../middlewares/validation.middleware');
const { ocrPdfSchema } = require('../validators/pdf.validator');
const pdfService = require('../services/pdf.service');

router.post('/', 
    validateFileUpload,
    validateSchema(ocrPdfSchema),
    asyncHandler(async (req, res) => {
        if (!req.files?.pdf) {
            throw new AppError(
                'No PDF file uploaded',
                400,
                'FILE_MISSING'
            );
        }

        try {
            const uniqueFileName = await pdfService.ocrPdf(req.files.pdf, req.body.ocrLocale);
            const filePath = `${req.protocol}://${req.get('host')}/result/${uniqueFileName}`;

            res.status(200).json({ 
                status: 'success',
                data: {
                    filePath,
                    originalName: req.files.pdf.name,
                    ocrLocale: req.body.ocrLocale
                }
            });
        } catch (error) {
            throw error;
        }
    })
);

module.exports = router; 