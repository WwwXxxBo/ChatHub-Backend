import * as Minio from 'minio'
import { minioConfig } from '../config/minio.config.js'

class MinioService {
  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: minioConfig.endPoint,
      port: minioConfig.port,
      useSSL: minioConfig.useSSL,
      accessKey: minioConfig.accessKey,
      secretKey: minioConfig.secretKey,
      region: minioConfig.region,
    })

    // 默认存储桶
    this.defaultBucket = process.env.MINIO_BUCKET || 'videos'

    // 初始化存储桶
    this.initBucket()
  }

  /**
   * 初始化存储桶
   */
  async initBucket() {
    try {
      const bucketExists = await this.minioClient.bucketExists(this.defaultBucket)
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.defaultBucket, minioConfig.region)
        console.log(`Bucket "${this.defaultBucket}" created successfully.`)

        // 设置存储桶策略（公开读取）
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.defaultBucket}/*`],
            },
          ],
        }
        await this.minioClient.setBucketPolicy(this.defaultBucket, JSON.stringify(policy))
      }
    } catch (error) {
      console.error('Error initializing bucket:', error)
    }
  }

  /**
   * 上传文件到MinIO
   * @param {Object} file - 文件对象（包含buffer、originalname等）
   * @param {string} folder - 文件夹路径
   * @returns {Promise<Object>} 上传结果
   */
  async uploadFile(file, folder = 'videos') {
    try {
      // 生成唯一文件名
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(7)
      const extension = file.originalname.split('.').pop()
      const fileName = `${folder}/${timestamp}-${randomString}.${extension}`

      console.log('上传文件信息:', {
        fileName: fileName,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      })

      // 上传文件
      await this.minioClient.putObject(this.defaultBucket, fileName, file.buffer, file.size, {
        'Content-Type': file.mimetype,
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalname)}"`,
      })

      console.log('文件上传到MinIO成功')

      // 生成访问URL（去掉查询参数的基础URL）
      const presignedUrl = await this.minioClient.presignedGetObject(
        this.defaultBucket,
        fileName,
        7 * 24 * 60 * 60, // 7天有效期
      )

      // 提取基础URL（去掉查询参数）
      const baseUrl = presignedUrl.split('?')[0]

      // 确保baseUrl是字符串
      if (Array.isArray(baseUrl)) {
        console.warn('⚠️ URL是数组，取第一个元素:', baseUrl[0])
        return {
          success: true,
          fileName: fileName,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          url: baseUrl[0], // 如果是数组，取第一个
          fullUrl: presignedUrl,
          bucket: this.defaultBucket,
        }
      }

      console.log('生成的URL:', {
        baseUrl: baseUrl,
        type: typeof baseUrl,
      })

      return {
        success: true,
        fileName: fileName,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        url: String(baseUrl), // 确保是字符串
        fullUrl: presignedUrl,
        bucket: this.defaultBucket,
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      throw new Error(`上传失败: ${error.message}`)
    }
  }

  /**
   * 获取文件列表
   * @param {string} prefix - 文件前缀（文件夹路径）
   * @returns {Promise<Array>} 文件列表
   */
  async listFiles(prefix = '') {
    try {
      const stream = this.minioClient.listObjects(this.defaultBucket, prefix, true)
      const files = []

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          files.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            etag: obj.etag,
          })
        })
        stream.on('error', reject)
        stream.on('end', () => resolve(files))
      })
    } catch (error) {
      console.error('Error listing files:', error)
      throw new Error(`获取文件列表失败: ${error.message}`)
    }
  }

  /**
   * 删除文件
   * @param {string} fileName - 文件名
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteFile(fileName) {
    try {
      await this.minioClient.removeObject(this.defaultBucket, fileName)
      return true
    } catch (error) {
      console.error('Error deleting file:', error)
      throw new Error(`删除文件失败: ${error.message}`)
    }
  }

  /**
   * 获取文件URL
   * @param {string} fileName - 文件名
   * @param {number} expires - URL有效期（秒）
   * @returns {Promise<string>} 文件URL
   */
  async getFileUrl(fileName, expires = 7 * 24 * 60 * 60) {
    try {
      return await this.minioClient.presignedGetObject(this.defaultBucket, fileName, expires)
    } catch (error) {
      console.error('Error getting file URL:', error)
      throw new Error(`获取文件URL失败: ${error.message}`)
    }
  }
}

export default new MinioService()
