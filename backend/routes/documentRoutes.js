const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const upload = require('../middleware/uploadMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

router.get('/', documentController.listDocuments);
router.post('/upload', upload.single('file'), documentController.uploadDocument);
router.get('/:id/ocr', documentController.getDocumentOcr);
router.get('/:id', documentController.getDocument);
router.delete('/:id', requireRole(['administrator', 'reviewer']), documentController.deleteDocument);

module.exports = router;
