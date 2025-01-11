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

module.exports = {
    compressPdfSchema,
    protectPdfSchema,
    splitPdfSchema,
    reorderPdfSchema,
    convertPdfSchema,
    removePdfProtectionSchema
}; 