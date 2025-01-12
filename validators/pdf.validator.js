const Joi = require('joi');
const { COMPRESSION_LEVELS } = require('../constants');

const compressPdfSchema = Joi.object({
    compressionLevel: Joi.string()
        .valid(...COMPRESSION_LEVELS)
        .default('HIGH')
});

const protectPdfSchema = Joi.object({
    password: Joi.string()
        .required()
        .min(6)
        .max(32)
});

const splitPdfSchema = Joi.object({
    fromPage: Joi.number().integer().min(1).required(),
    toPage: Joi.number().integer().min(1).required()
});

const reorderPdfSchema = Joi.object({
    pageOrder: Joi.string().pattern(/^\d+(,\d+)*$/).required()
});

const convertPdfSchema = Joi.object({
    inputFormat: Joi.string()
        .valid('pdf')
        .default('pdf'),
    exportFormat: Joi.string()
        .valid('docx', 'jpeg', 'png')
        .required()
});

const removePdfProtectionSchema = Joi.object({
    password: Joi.string()
        .required()
        .min(1)
        .max(128)
        .messages({
            'string.empty': 'Password is required',
            'string.min': 'Password must be at least 1 character long',
            'string.max': 'Password cannot be longer than 128 characters',
            'any.required': 'Password is required'
        })
});

const ocrPdfSchema = Joi.object({
    ocrLocale: Joi.string()
        .valid(
            'bg-BG', 'ca-CA', 'cs-CZ', 'da-DK', 'de-DE', 'de-CH',
            'el-GR', 'en-GB', 'en-US', 'es-ES', 'et-EE', 'fi-FI',
            'fr-FR', 'hr-HR', 'hu-HU', 'it-IT', 'iw-IL', 'ja-JP',
            'ko-KR', 'lt-LT', 'lv-LV', 'mk-MK', 'mt-MT', 'nb-NO',
            'nl-NL', 'no-NO', 'pl-PL', 'pt-BR', 'ro-RO', 'ru-RU',
            'sk-SK', 'sl-SI', 'sr-SR', 'sv-SE', 'tr-TR', 'uk-UA',
            'zh-CN', 'zh-HK'
        )
        .default('en-US')
        .description('The language of the text in the PDF')
});

module.exports = {
    compressPdfSchema,
    protectPdfSchema,
    splitPdfSchema,
    reorderPdfSchema,
    convertPdfSchema,
    removePdfProtectionSchema,
    ocrPdfSchema
}; 