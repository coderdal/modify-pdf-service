const express = require('express');
const { removePdfProtectionSchema } = require('../validators/pdf.validator.js');
const { validateSchema } = require('../middlewares/validation.middleware.js');
const { AppError } = require('../middlewares/error.middleware.js');
const pdfService = require('../services/pdf.service.js');
const { validateFileUpload } = require('../middlewares/fileUpload.middleware.js');

const router = express.Router();

router.post(
    '/',
    validateFileUpload,
    validateSchema(removePdfProtectionSchema),
    async (req, res, next) => {
        try {
            if (!req.files?.pdf) {
                throw new AppError('No PDF file uploaded', 400, 'FILE_REQUIRED');
            }

            const { password } = req.body;
            if (!password) {
                throw new AppError('Password is required', 400, 'PASSWORD_REQUIRED');
            }

            try {
                const uniqueFileName = await pdfService.removeProtection(req.files.pdf, password);
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
