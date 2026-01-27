import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import { promises as fs } from 'fs'
import sharp from 'sharp'
import minioService from './minio-service'

class ThumbnailService {
  constructor() {
    // 确保临时目录存在
    this.tempDir = path.join(process.cwd(), 'temp')
    this.initTempDir()
  }

  async initTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
    } catch (error) {
      console.error('创建临时目录失败:', error)
    }
  }

  /**
   * 从视频生成封面
   * @param {Buffer} videoBuffer - 视频文件缓冲区
   * @param {string} originalName - 原始文件名
   * @returns {Promise<{coverBuffer: Buffer, thumbnailBuffer: Buffer}>}
   */
  async generateThumbnails(videoBuffer, originalName) {
    const tempVideoPath = path.join(this.tempDir, `temp_${Date.now()}_${originalName}`)
    const tempCoverPath = path.join(this.tempDir, `cover_${Date.now()}.jpg`)
    const tempThumbPath = path.join(this.tempDir, `thumb_${Date.now()}.jpg`)

    try {
      // 写入临时视频文件
      await fs.writeFile(tempVideoPath, videoBuffer)
      // 生成封面（视频第一帧）
      const coverBuffer = await this.extractVideoFrame(tempVideoPath, tempCoverPath)
      // 生成缩略图（缩放到 320x180）
      const thumbnailBuffer = await this.resizeImage(coverBuffer, 320, 180)
      return {
        coverBuffer,
        thumbnailBuffer,
      }
    } finally {
      // 清理临时文件
      await this.cleanupTempFiles([tempVideoPath, tempCoverPath, tempThumbPath])
    }
  }

  /**
   * 提取视频帧
   */
  async extractVideoFrame(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshot({
          timestamps: ['0'],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '1920x?',
        })
        .on('end', async () => {
          try {
            const buffer = await fs.readFile(outputPath)
            resolve(buffer)
          } catch (error) {
            reject(error)
          }
        })
        .on('error', reject)
    })
  }

  /**
   * 调整图片尺寸
   */
  async resizeImage(buffer, width, height) {
    return sharp(buffer).resize(width, height, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer()
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles(filePaths) {
    const cleanupPromises = filePaths.map(async (filePath) => {
      try {
        await fs.unlink(filePath)
      } catch (error) {
        // 忽略文件不存在的错误
        if (error.code !== 'ENOENT') {
          console.warn(`清理临时文件失败 ${filePath}:`, error.message)
        }
      }
    })
    await Promise.allSettled(cleanupPromises)
  }

  /**
   * 上传封面到MinIO
   */
  async uploadThumbnail(videoId, coverBuffer, thumbnailBuffer, originalName) {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)

    // 生成封面文件名
    const coverFileName = `covers/${timestamp}-${randomString}-cover.jpg`
    const thumbFileName = `covers/${timestamp}-${randomString}-thumb.jpg`

    // 上传封面
    const coverResult = await minioService.uploadBuffer(
      coverBuffer,
      coverFileName,
      'image/jpeg',
      `cover-${originalName}`,
    )

    // 上传缩略图
    const thumbResult = await minioService.uploadBuffer(
      thumbnailBuffer,
      thumbFileName,
      'image/jpeg',
      `thumbnail-${originalName}`,
    )

    return {
      coverUrl: coverResult.url,
      thumbnailUrl: thumbResult.url,
    }
  }
}

export default new ThumbnailService()
