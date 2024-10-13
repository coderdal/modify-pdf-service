const MAX_FILE_SIZE = 20 * 1024 * 1024;
const TEMP_FILE_LIFETIME = 5 * 60 * 1000;
const TEMP_FILE_DIR = '/tmp/';
const RESULT_FILE_DIR = 'temp';

const EXPORT_FORMATS = {
    docx: 'DOCX',
    jpeg: 'JPEG',
    png: 'PNG'
}

const INPUT_FORMATS = {
    pdf: 'PDF'
}

const ALLOWED_FILE_TYPES = ['application/pdf'];

export { MAX_FILE_SIZE, TEMP_FILE_DIR, RESULT_FILE_DIR, EXPORT_FORMATS, INPUT_FORMATS, ALLOWED_FILE_TYPES, TEMP_FILE_LIFETIME };