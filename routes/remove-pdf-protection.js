const express = require('express');
const router = express.Router();
const { validateFileUpload } = require('../middlewares/fileUpload.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const { protectPdfSchema } = require('../validators/pdf.validator');
const pdfService = require('../services/pdf.service');

router.post('/', 
    validateFileUpload,
    asyncHandler(async (req, res) => {
        const { error, value } = protectPdfSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                status: 'error',
                message: error.details[0].message,
                code: 'VALIDATION_ERROR'
            });
        }

        const uniqueFileName = await pdfService.removeProtection(req.files.pdf, value.password);
        const filePath = `${req.protocol}://${req.get('host')}/result/${uniqueFileName}`;

        res.status(200).json({ 
            status: 'success',
            data: {
                filePath
            }
        });
    })
);

module.exports = router;
