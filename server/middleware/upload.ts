import multer from 'multer'
import { CONSTANTS } from '../config/constants'
import { ValidationError } from '../services/errors'

const storage = multer.memoryStorage()

export const uploadPdf = multer({
  storage,
  limits: {
    fileSize: CONSTANTS.MAX_UPLOAD_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      cb(null, true)
    } else {
      cb(new ValidationError('Invalid file type. Only PDF documents (.pdf) are supported.'))
    }
  },
})
