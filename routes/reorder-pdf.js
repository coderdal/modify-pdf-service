const express = require('express');
const router = express.Router();
const { reorderPdfSchema } = require('../validators/pdf.validator');
const { validateSchema } = require('../middlewares/validation.middleware');
const { AppError } = require('../middlewares/error.middleware');
const pdfService = require('../services/pdf.service');
const { validateFileUpload } = require('../middlewares/fileUpload.middleware');

router.post(
    '/',
    validateFileUpload,
    validateSchema(reorderPdfSchema),
    async (req, res, next) => {
        try {
            
            if (!req.files?.pdf) {
                throw new AppError('No PDF file uploaded', 400, 'FILE_REQUIRED');
            }
            
            const { pageOrder } = req.body;
            if (!pageOrder) {
                throw new AppError('Page order is required', 400, 'PAGE_ORDER_REQUIRED');
            }

            const pages = pageOrder.split(',').map(Number);
            if (pages.some(page => isNaN(page) || page < 1)) {
                throw new AppError(
                    'Invalid page order. Please provide positive numbers separated by commas.',
                    400,
                    'INVALID_PAGE_ORDER'
                );
            }

            if (new Set(pages).size !== pages.length) {
                throw new AppError(
                    'Duplicate page numbers are not allowed',
                    400,
                    'DUPLICATE_PAGES'
                );
            }

            try {
                const uniqueFileName = await pdfService.reorderPdf(req.files.pdf, pageOrder);
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