# PDF Toolkit - Backend API

![Tech Stack](https://img.shields.io/badge/Tech%20Stack-Node.js%20%7C%20Express%20%7C%20Adobe%20PDF%20Services-blue)
![License](https://img.shields.io/badge/License-MIT-green)

A robust Node.js backend service that powers the PDF Toolkit application. This service provides a comprehensive API for PDF manipulation using Adobe PDF Services SDK and other PDF processing libraries.

🔗 **Live Demo**: [https://pdf.erdal.net.tr](https://pdf.erdal.net.tr)

> **Note**: This is the backend service for the PDF Toolkit application. For the frontend application that consumes this API, please visit [PDF Toolkit Frontend](https://github.com/coderdal/modify-pdf).

## 🚀 Features

### PDF Operations
- 📄 **Format Conversion**
  - PDF to Word (DOCX)
  - PDF to Image formats
- 🗜️ **Compression**
  - Multiple compression levels
  - Smart size reduction
- 🔒 **Security**
  - Add password protection
  - Remove PDF restrictions
- ✂️ **Document Manipulation**
  - Split PDFs by page range
  - Merge multiple PDFs
  - Remove specific pages
  - Reorder pages
  - Rotate pages
  - Add page numbers
- 🔍 **OCR Processing**
  - Convert scanned documents to searchable PDFs
  - Support for multiple languages
- 📋 **Text Extraction**
  - Extract text content
  - Preserve formatting

### API Features
- 📤 File upload handling
- 🔐 Input validation
- ⚡ Async processing
- 🧹 Automatic temp file cleanup
- 📝 Detailed error responses
- 🔄 Progress tracking

## 🛠️ Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express](https://expressjs.com/)
- **PDF Processing**: 
  - [Adobe PDF Services SDK](https://developer.adobe.com/document-services/apis/pdf-services/)
  - [pdf-lib](https://github.com/Hopding/pdf-lib)
- **File Upload**: express-fileupload
- **Validation**: Joi
- **Error Handling**: Custom middleware
- **Logging**: Morgan

## 📡 API Endpoints

### PDF Operations
- POST `/api/compress-pdf` - Compress PDF file
- POST `/api/convert-pdf` - Convert PDF to other formats
- POST `/api/protect-pdf` - Add password protection
- POST `/api/remove-pdf-protection` - Remove password protection
- POST `/api/split-pdf` - Extract page range
- POST `/api/merge-pdf` - Combine multiple PDFs
- POST `/api/reorder-pdf` - Rearrange pages
- POST `/api/rotate-pdf` - Rotate pages
- POST `/api/ocr-pdf` - Perform OCR on PDF
- POST `/api/extract-text` - Extract text content

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Adobe PDF Services API credentials
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/coderdal/modify-pdf-service.git
   cd modify-pdf-service
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the environment variables in `.env`:
   ```
   PDF_SERVICES_CLIENT_ID=your_client_id
   PDF_SERVICES_CLIENT_SECRET=your_client_secret
   FRONTEND_URL=your_frontend_url
   PORT=3000
   ```

5. Start the development server:
   ```bash
   npm start
   ```

## 🐳 Docker Support

Build and run the application using Docker:

```bash
# Build the image
docker build -t pdf-toolkit-backend .

# Run the container
docker run -p 3005:3000 \
  -e PDF_SERVICES_CLIENT_ID=your_client_id \
  -e PDF_SERVICES_CLIENT_SECRET=your_client_secret \
  -e FRONTEND_URL=your_frontend_url \
  -e PORT=3000 \
  pdf-toolkit-backend:latest
```

## 📦 Project Structure

```
pdf-toolkit-backend/
├── routes/           # API route handlers
├── services/         # Business logic and PDF operations
├── middlewares/      # Express middlewares
├── validators/       # Request validation schemas
├── temp/            # Temporary file storage
├── constants.js     # Application constants
└── app.js           # Express application setup
```

## 🔒 Security

- CORS protection
- Request validation
- File type checking
- Temporary file cleanup
- Error handling
- Rate limiting

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Check out our [GitHub repository](https://github.com/coderdal/modify-pdf-service) for more information.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Muhammed Erdal**
- LinkedIn: [muhammederdal](https://linkedin.com/in/muhammederdal)
- GitHub: [coderdal](https://github.com/coderdal) 
