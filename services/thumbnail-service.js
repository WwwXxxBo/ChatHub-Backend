import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'
import path from 'path'
import { promises as fs } from 'fs'
import sharp from 'sharp'
import minioService from './minio-service.js'

// 设置ffmpeg和ffprobe路径
ffmpeg.setFfmpegPath(ffmpegInstaller.path)
ffmpeg.setFfprobePath(ffprobeInstaller.path)

class ThumbnailService {
  constructor() {
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
   */
  async generateThumbnails(videoBuffer, originalName) {
    // 修复：确保originalName不为undefined
    const cleanName = (originalName || `video_${Date.now()}.mp4`).replace(/[^\w.\-]/g, '_')

    const tempVideoPath = path.join(this.tempDir, `temp_${Date.now()}_${cleanName}`)
    const tempCoverPath = path.join(this.tempDir, `cover_${Date.now()}.jpg`)
    const tempThumbPath = path.join(this.tempDir, `thumb_${Date.now()}.jpg`)

    try {
      // 1. 写入临时视频文件
      await fs.writeFile(tempVideoPath, videoBuffer)

      // 2. 获取视频时长（使用ffprobe）
      const durationInSeconds = await this.getVideoDuration(tempVideoPath)
      const formattedDuration = this.formatDuration(durationInSeconds)

      // 3. 生成封面（视频第0秒的帧）
      const coverBuffer = await this.extractVideoFrame(tempVideoPath, tempCoverPath)

      // 4. 生成缩略图
      const thumbnailBuffer = await sharp(coverBuffer)
        .resize(320, 180, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer()

      return {
        coverBuffer,
        thumbnailBuffer,
        duration: formattedDuration,
      }
    } catch (error) {
      console.error('生成缩略图出错:', error)
      throw error
    } finally {
      // 清理临时文件
      await this.cleanupTempFiles([tempVideoPath, tempCoverPath, tempThumbPath])
    }
  }

  /**
   * 获取视频时长
   */
  async getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error('获取视频时长失败:', err.message)
          return reject(err)
        }

        // 优先从format获取时长
        if (metadata.format && metadata.format.duration) {
          const duration = parseFloat(metadata.format.duration)
          console.log('获取到视频时长（秒）:', duration)
          resolve(duration)
        } else if (metadata.streams && metadata.streams[0] && metadata.streams[0].duration) {
          // 从第一个stream获取
          const duration = parseFloat(metadata.streams[0].duration)
          console.log('从stream获取视频时长（秒）:', duration)
          resolve(duration)
        } else {
          console.warn('无法获取视频时长，返回默认值0')
          resolve(0)
        }
      })
    })
  }

  /**
   * 提取视频帧
   */
  async extractVideoFrame(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(0) // 从0秒开始
        .frames(1) // 只取1帧
        .output(outputPath)
        .on('end', async () => {
          try {
            const buffer = await fs.readFile(outputPath)
            resolve(buffer)
          } catch (error) {
            reject(error)
          }
        })
        .on('error', reject)
        .run()
    })
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath)
      } catch (error) {
        // 忽略文件不存在的错误
        if (error.code !== 'ENOENT') {
          console.warn(`清理临时文件失败 ${filePath}:`, error.message)
        }
      }
    }
  }

  /**
   * 上传封面到MinIO
   */
  async uploadThumbnail(videoId, coverBuffer, thumbnailBuffer, originalName, duration = '0:00') {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)

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
   * 格式化视频时长
   */
  formatDuration(seconds) {
    if (!seconds || seconds <= 0) {
      return '0:00'
    }

    const totalSeconds = Math.round(seconds)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const remainingSeconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }
  }
}

export default new ThumbnailService()
