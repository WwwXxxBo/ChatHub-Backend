import multer from 'multer'
import multerS3 from 'multer-s3'
import minioService from '../services/minio-service.js'

// 允许的视频格式
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/3gpp',
  'video/3gpp2',
]

// 文件大小限制（100MB）
const MAX_FILE_SIZE = 100 * 1024 * 1024

// 验证文件类型
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(
      new Error(
        `不支持的文件格式:${file.mimetype}。支持的文件格式:${ALLOWED_MIME_TYPES.join(', ')}`,
      ),
      false,
    )
  }
}

// 配置 Multer S3
export const upload = multer({
  storage: multerS3({
    s3: minioService.minioClient,
    bucket: minioService.defaultBucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, {
        fileName: file.fieldname,
        originalName: file.originalname,
        uploadTime: new Date.toISOString(),
      })
    },
    key: (req, file, cb) => {
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(7)
      const extension = file.originalname.split('.').pop()
      const fileName = `videos/${timestamp}-${randomString}.${extension}`
      cb(null, fileName)
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: fileFilter,
})

// 内存存储（用于小文件或处理前验证）
export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: fileFilter,
})

export default {
  upload,
  memoryUpload,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
}
