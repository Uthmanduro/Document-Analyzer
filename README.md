# Document Analyzer API

## Overview
This is a robust Node.js Express API designed for comprehensive document management and analysis. It facilitates the upload, storage, text extraction, and AI-powered analysis of PDF documents. The backend utilizes MongoDB with Mongoose for data persistence, AWS S3 (or MinIO) for scalable file storage, and integrates with an OpenRouter-compatible Large Language Model for advanced document intelligence.

## Features
-   **Express.js**: Provides a minimalist and flexible framework for building the API endpoints.
-   **Mongoose**: Object Data Modeling (ODM) for interacting with MongoDB, enabling structured storage of document metadata.
-   **AWS S3 / MinIO**: Configurable object storage service for secure and scalable storage of uploaded PDF files.
-   **PDF-Parse**: Extracts textual content from PDF documents for further processing.
-   **OpenRouter API**: Integrates with various Large Language Models to perform document summarization, type classification, and detailed metadata extraction.
-   **Multer**: Middleware for handling `multipart/form-data`, specifically configured for efficient PDF file uploads with size and type validations.
-   **Dotenv**: Manages environment variables, ensuring secure and flexible configuration.

## Getting Started
To set up and run the Document Analyzer API locally, follow these instructions.

### Installation
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Uthmanduro/Document-Analyzer.git
    cd Document-Analyzer
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Start the Server**:
    ```bash
    npm start
    ```
    For development with automatic restarts on file changes:
    ```bash
    npm run dev
    ```

### Environment Variables
Create a `.env` file in the project root directory and define the following variables:

-   `MONGODB_URI`: Connection string for your MongoDB database.
    *Example: `mongodb://localhost:27017/document_analyzer`*
-   `S3_ENDPOINT`: The endpoint URL for your S3-compatible storage service (e.g., MinIO or AWS S3).
    *Example: `http://localhost:9000` (for MinIO) or `https://s3.your-region.amazonaws.com`*
-   `S3_ACCESS_KEY`: The access key ID for authenticating with your S3-compatible storage.
    *Example: `minioadmin`*
-   `S3_SECRET_KEY`: The secret access key for authenticating with your S3-compatible storage.
    *Example: `minioadmin`*
-   `S3_BUCKET_NAME`: The name of the S3 bucket where documents will be stored.
    *Example: `document-uploads`*
-   `OPENROUTER_API_KEY`: Your API key for OpenRouter to access large language model services.
    *Example: `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`*
-   `PORT`: (Optional) The port on which the Express server will listen. Defaults to `3000`.
    *Example: `3000`*

## API Documentation
### Base URL
`http://localhost:3000/api` (or the port configured in your `.env` file)

### Endpoints

#### GET /health
**Description**: Provides a health check for the API and its dependent services (MongoDB, S3, OpenRouter).

**Request**:
No request body or parameters.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2023-10-27T10:00:00.000Z",
  "services": {
    "mongodb": "connected",
    "s3": "configured",
    "openrouter": "configured"
  }
}
```

**Errors**:
-   `500 Internal Server Error`: An unexpected server-side error occurred.

#### POST /documents/upload
**Description**: Uploads a PDF file, stores it in the configured S3-compatible storage, and initiates text extraction.

**Request**:
`Content-Type: multipart/form-data`
`file`: (File) The PDF file to be uploaded.
*Constraints*: Maximum file size is 5MB. Only PDF file types are accepted.

**Response**:
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "document": {
    "id": "653b6f9a0a1b2c3d4e5f6789",
    "filename": "example_report.pdf",
    "filesize": 102400,
    "storageUrl": "http://localhost:9000/document-uploads/documents/1678901234567-example_report.pdf",
    "status": "text_extracted",
    "uploadedAt": "2023-10-27T10:00:00.000Z",
    "hasText": true
  }
}
```

**Errors**:
-   `400 Bad Request`:
    -   `No file uploaded`: No file was attached to the request.
    -   `File too large`: The uploaded file exceeds the 5MB size limit.
    -   `Only PDF files are allowed`: The file type is not `application/pdf`.
-   `500 Internal Server Error`: Failed to upload the file to storage or save document metadata to the database.

#### POST /documents/:id/analyze
**Description**: Triggers the AI analysis of an uploaded document using an OpenRouter-compatible LLM. This endpoint requires the document to have previously extracted text.

**Request**:
No request body.
`id`: (Path Parameter) The unique MongoDB `_id` of the document to be analyzed.

**Response**:
```json
{
  "success": true,
  "message": "Document analyzed successfully",
  "document": {
    "id": "653b6f9a0a1b2c3d4e5f6789",
    "filename": "example_report.pdf",
    "status": "analyzed",
    "analysis": {
      "summary": "This document is a quarterly financial report from Tech Solutions Inc., detailing revenue, expenses, and profit margins for Q3. It includes projections for the next fiscal year.",
      "documentType": "financial report",
      "metadata": {
        "date": "2023-09-30",
        "company": "Tech Solutions Inc.",
        "period": "Q3 2023"
      },
      "analyzedAt": "2023-10-27T10:05:00.000Z"
    }
  }
}
```

**Errors**:
-   `400 Bad Request`:
    -   `No text extracted`: The specified document does not have extracted text available for analysis.
-   `404 Not Found`:
    -   `Document not found`: No document exists with the provided ID.
-   `500 Internal Server Error`: Failed to perform analysis due to an LLM error or an internal server issue.

#### GET /documents/:id
**Description**: Retrieves the complete details of a specific document, including its extracted text and analysis results.

**Request**:
No request body.
`id`: (Path Parameter) The unique MongoDB `_id` of the document to retrieve.

**Response**:
```json
{
  "success": true,
  "document": {
    "id": "653b6f9a0a1b2c3d4e5f6789",
    "filename": "example_report.pdf",
    "filesize": 102400,
    "mimeType": "application/pdf",
    "storageUrl": "http://localhost:9000/document-uploads/documents/1678901234567-example_report.pdf",
    "status": "analyzed",
    "uploadedAt": "2023-10-27T10:00:00.000Z",
    "updatedAt": "2023-10-27T10:05:00.000Z",
    "extractedText": "This is the full extracted text content of the PDF document, detailing financial figures and corporate strategy...",
    "analysis": {
      "summary": "This document is a quarterly financial report from Tech Solutions Inc., detailing revenue, expenses, and profit margins for Q3. It includes projections for the next fiscal year.",
      "documentType": "financial report",
      "metadata": {
        "date": "2023-09-30",
        "company": "Tech Solutions Inc.",
        "period": "Q3 2023"
      },
      "analyzedAt": "2023-10-27T10:05:00.000Z"
    }
  }
}
```

**Errors**:
-   `404 Not Found`:
    -   `Document not found`: No document exists with the provided ID.
-   `500 Internal Server Error`: Failed to fetch document details.

#### GET /documents
**Description**: Retrieves a paginated list of all uploaded documents. For performance, the `extractedText` field is omitted from this list view.

**Request**:
No request body.
**Query Parameters**:
-   `status`: (Optional) Filters the list by document status (e.g., `uploaded`, `text_extracted`, `analyzing`, `analyzed`, `failed`).
-   `limit`: (Optional) Specifies the maximum number of documents to return per page. Default is `50`.
-   `offset`: (Optional) Specifies the number of documents to skip, used for pagination. Default is `0`.

**Response**:
```json
{
  "success": true,
  "total": 2,
  "limit": 50,
  "offset": 0,
  "documents": [
    {
      "id": "653b6f9a0a1b2c3d4e5f6789",
      "filename": "report_q3.pdf",
      "filesize": 102400,
      "status": "analyzed",
      "documentType": "financial report",
      "uploadedAt": "2023-10-27T10:00:00.000Z",
      "analyzedAt": "2023-10-27T10:05:00.000Z"
    },
    {
      "id": "653b6f9a0a1b2c3d4e5f6790",
      "filename": "invoice_123.pdf",
      "filesize": 50000,
      "status": "text_extracted",
      "documentType": null,
      "uploadedAt": "2023-10-27T09:30:00.000Z",
      "analyzedAt": null
    }
  ]
}
```

**Errors**:
-   `500 Internal Server Error`: Failed to retrieve the list of documents.

#### DELETE /documents/:id
**Description**: Deletes a document from the database and its corresponding file from the S3-compatible storage.

**Request**:
No request body.
`id`: (Path Parameter) The unique MongoDB `_id` of the document to delete.

**Response**:
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**Errors**:
-   `404 Not Found`:
    -   `Document not found`: No document exists with the provided ID.
-   `500 Internal Server Error`: Failed to delete the document from the database or S3 storage.

## Technologies Used
| Technology         | Description                                                                  |
| :----------------- | :--------------------------------------------------------------------------- |
| **Node.js**        | JavaScript runtime environment for executing server-side code.               |
| **Express.js**     | A fast, unopinionated, minimalist web framework for Node.js.                 |
| **Mongoose**       | An elegant MongoDB object data modeling (ODM) library for Node.js.           |
| **MongoDB**        | A flexible NoSQL document database used for storing document metadata.       |
| **AWS SDK (S3)**   | Provides a JavaScript interface to Amazon S3 and S3-compatible services like MinIO. |
| **MinIO**          | High-performance, S3 compatible object storage, often used for local development. |
| **PDF-Parse**      | A Node.js module specifically designed for extracting text content from PDF files. |
| **Axios**          | A promise-based HTTP client for making requests to external APIs, such as OpenRouter. |
| **Multer**         | Node.js middleware for handling `multipart/form-data`, primarily for file uploads. |
| **Dotenv**         | A zero-dependency module that loads environment variables from a `.env` file. |

## Contributing
We welcome contributions to the Document Analyzer API! To contribute, please follow these guidelines:

1.  Fork the repository to your GitHub account.
2.  Create a new branch for your feature or bug fix: `git checkout -b feature/your-feature-name` or `bugfix/issue-description`.
3.  Implement your changes, ensuring adherence to existing coding styles and standards.
4.  Write or update unit and integration tests to cover your modifications.
5.  Commit your changes with a clear and concise message.
6.  Push your branch to your forked repository.
7.  Open a pull request to the main repository's `main` branch, providing a detailed description of your changes and their purpose.

## License
This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).

## Author
**Uthman Durosinlohun**
-   LinkedIn: [Your LinkedIn Profile](https://www.linkedin.com/in/yourusername)
-   Portfolio: [Your Portfolio Site](https://www.yourportfolio.com)
-   Twitter: [Your Twitter Handle](https://twitter.com/yourhandle)

## Badges
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-800000?style=flat&logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![MinIO](https://img.shields.io/badge/MinIO-519DFF?style=flat&logo=minio&logoColor=white)](https://min.io/)
[![ISC License](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://www.npmjs.com/package/dokugen)