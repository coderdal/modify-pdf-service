const express = require('express');
const router = express.Router();
const { splitPdfSchema } = require('../validators/pdf.validator');
const { validateSchema } = require('../middlewares/validation.middleware');
const { AppError } = require('../middlewares/error.middleware');
const pdfService = require('../services/pdf.service');
const { validateFileUpload } = require('../middlewares/fileUpload.middleware');

router.post(
    '/',
    validateFileUpload,
    (req, res, next) => {
        req.body.fromPage = parseInt(req.body.fromPage);
        req.body.toPage = parseInt(req.body.toPage);
        next();
    },
    validateSchema(splitPdfSchema),
    async (req, res, next) => {
        try {
            if (!req.files?.pdf) {
                throw new AppError('No PDF file uploaded', 400, 'FILE_REQUIRED');
            }

            const { fromPage, toPage } = req.body;
            if (!fromPage || !toPage) {
                throw new AppError('Page range is required', 400, 'PAGE_RANGE_REQUIRED');
            }

            if (!Number.isInteger(fromPage) || !Number.isInteger(toPage) || fromPage < 1 || toPage < 1) {
                throw new AppError(
                    'Page numbers must be positive integers',
                    400,
                    'INVALID_PAGE_NUMBERS'
                );
            }

            try {
                const uniqueFileName = await pdfService.splitPdf(req.files.pdf, fromPage, toPage);
                const filePath = `${req.protocol}://${req.get('host')}/result/${uniqueFileName}`;
    
                res.status(200).json({ 
                    status: 'success',
                    data: {
                        filePath,
                        originalName: req.files.pdf.name
                    }
                });
            } catch (error) {
                throw error;
            }
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router; 