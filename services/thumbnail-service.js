import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import path from 'path'
import { promises as fs } from 'fs'
import sharp from 'sharp'
import minioService from './minio-service.js'

// 设置ffmpeg路径
if (process.platform === 'win32') {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path)
} else {
  // Linux/Mac
  ffmpeg.setFfmpegPath('ffmpeg')
}

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

      // 获取视频时长
      const durationInSeconds = await this.getVideoDuration(tempVideoPath)
      const formattedDuration = this.formatDuration(durationInSeconds)
      console.log('视频时长计算完成:', {
        seconds: durationInSeconds,
        formatted: formattedDuration,
        fileName: originalName,
      })

      // 生成封面（视频第一帧）
      const coverBuffer = await this.extractVideoFrame(tempVideoPath, tempCoverPath)
      // 生成缩略图（缩放到 320x180）
      const thumbnailBuffer = await this.resizeImage(coverBuffer, 320, 180)
      return {
        coverBuffer,
        thumbnailBuffer,
        duration: formattedDuration,
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
      console.log('开始提取视频帧，视频路径:', videoPath)

      const command = ffmpeg(videoPath)
        .inputOptions([
          '-loglevel',
          'error', // 只显示错误日志
        ])
        .outputOptions([
          '-frames:v',
          '1', // 只取一帧
          '-q:v',
          '2', // 高质量
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg命令:', commandLine)
        })
        .on('end', async () => {
          console.log('视频帧提取完成:', outputPath)
          try {
            const buffer = await fs.readFile(outputPath)
            resolve(buffer)
          } catch (error) {
            console.error('读取提取的帧失败:', error)
            reject(error)
          }
        })
        .on('error', (err, stdout, stderr) => {
          console.error('FFmpeg错误:', err.message)
          console.error('标准输出:', stdout)
          console.error('标准错误:', stderr)
          reject(err)
        })
        .on('stderr', (stderrLine) => {
          console.log('FFmpeg stderr:', stderrLine)
        })

      command.run()
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
  async uploadThumbnail(videoId, coverBuffer, thumbnailBuffer, originalName, duration = '0:00') {
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
      duration: duration,
    }
  }

  /**
   * 获取视频时长（单位：秒）
   * @param {string} videoPath - 视频文件路径
   * @returns {Promise<number>} 视频时长（秒）
   */
  async getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error('获取视频时长失败:', err.message)
          // 如果获取失败，返回默认值0
          resolve(0)
          return
        }

        const duration = metadata.format.duration || 0
        console.log('视频时长信息:', {
          path: videoPath,
          duration: duration,
          format: this.formatDuration(duration),
        })

        resolve(duration)
      })
    })
  }

  /**
   * 格式化视频时长
   * @param {number} seconds - 秒数
   * @returns {string} 格式化后的时长，如 "10:30"
   */
  formatDuration(seconds) {
    if (!seconds || seconds <= 0) {
      return '0:00'
    }

    const totalSeconds = Math.round(seconds)
    const minutes = Math.floor(totalSeconds / 60)
    const remainingSeconds = totalSeconds % 60

    // 格式化为 "分:秒"，秒数保持两位
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
}

export default new ThumbnailService()
