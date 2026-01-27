import minioService from './minio-service.js'
import prisma from '../prisma/prisma.js'
import thumbnailService from './thumbnail-service.js'

class UploadService {
  /**
   * 上传视频文件
   * @param {Object} file - 文件对象
   * @param {number} userId - 用户ID
   * @param {string} videoId - 视频ID（前端生成）
   * @param {Object} metadata - 文件元数据
   * @returns {Promise<Object>} 上传结果
   */
  async uploadVideo(file, userId, videoId, metadata = {}) {
    let uploadResult = null
    let coverResult = null

    try {
      // 1. 上传视频到MinIO
      uploadResult = await minioService.uploadFile(file, 'videos')

      // 2. 生成并上传封面
      const thumbnails = await thumbnailService.generateThumbnails(file.buffer, file.originalName)

      coverResult = await thumbnailService.uploadThumbnail(
        videoId,
        thumbnails.coverBuffer,
        thumbnails.thumbnailBuffer,
        file.originalname,
        thumbnails.duration,
      )

      // 3. 保存到数据库
      const dbData = {
        videoId: videoId,
        userId: parseInt(userId),
        fileName: uploadResult.fileName,
        originalName: file.originalname,
        url: uploadResult.url,
        title: metadata.title || file.originalname, // 使用传入的title或文件名
        coverUrl: coverResult.coverUrl,
        thumbnailUrl: coverResult.thumbnailUrl,
        duration: coverResult.duration,
        size: parseInt(uploadResult.size),
        mimeType: file.mimetype,
        bucket: uploadResult.bucket,
        metadata: JSON.stringify({
          ...metadata,
          originalMetadata: metadata,
          duration: thumbnails.duration, // 也保存在metadata中备份
          durationSeconds: await this.convertDurationToSeconds(thumbnails.duration),
          dimensions: metadata.dimensions || '1920x1080',
          uploadMethod: 'auto-generated-thumbnails',
        }),
        uploadTime: new Date(),
        tags:
          typeof metadata.tags === 'string' ? metadata.tags : JSON.stringify(metadata.tags || []),
        category: metadata.category || '',
        description: metadata.description || '',
        status: 1,
      }

      const videoRecord = await prisma.video.create({
        data: dbData,
      })

      // 5. 解析tags（如果是JSON字符串）
      let tags = []
      try {
        if (metadata.tags) {
          tags = typeof metadata.tags === 'string' ? JSON.parse(metadata.tags) : metadata.tags
        }
      } catch (e) {
        console.warn('解析tags失败:', e.message)
        tags = Array.isArray(metadata.tags) ? metadata.tags : []
      }

      return {
        status: true,
        data: {
          id: videoRecord.id,
          videoId: videoRecord.videoId,
          fileName: file.originalname,
          url: uploadResult.url,
          coverUrl: coverResult.coverUrl,
          thumbnailUrl: coverResult.thumbnailUrl,
          duration: coverResult.duration,
          size: uploadResult.size,
          mimeType: file.mimetype,
          title: videoRecord.title,
          category: videoRecord.category,
          tags: tags, // 返回解析后的数组
          description: videoRecord.description,
          difficulty: videoRecord.difficulty,
          uploadTime: videoRecord.uploadTime,
        },
        message: '视频上传成功，封面已自动生成',
      }
    } catch (error) {
      // 错误处理 - 清理所有已上传的文件
      await this.rollbackUpload(uploadResult, coverResult)
      throw error
    }
  }

  /**
   * 将时长字符串转换为秒数
   * @param {string} duration - 时长字符串，如 "10:30"
   * @returns {number} 秒数
   */
  async convertDurationToSeconds(duration) {
    if (!duration) return 0

    try {
      const parts = duration.split(':')
      if (parts.length === 2) {
        const minutes = parseInt(parts[0])
        const seconds = parseInt(parts[1])
        return minutes * 60 + seconds
      } else if (parts.length === 3) {
        // 处理 "时:分:秒" 格式
        const hours = parseInt(parts[0])
        const minutes = parseInt(parts[1])
        const seconds = parseInt(parts[2])
        return hours * 3600 + minutes * 60 + seconds
      }
      return 0
    } catch (error) {
      console.error('转换时长失败:', error)
      return 0
    }
  }

  /**
   * 回滚上传
   */
  async rollbackUpload(uploadResult, coverResult) {
    const cleanupPromises = []

    if (uploadResult?.fileName) {
      cleanupPromises.push(minioService.deleteFile(uploadResult.fileName))
    }

    if (coverResult?.coverUrl) {
      // 从URL中提取文件名
      const coverFileName = this.extractFileNameFromUrl(coverResult.coverUrl)
      if (coverFileName) {
        cleanupPromises.push(minioService.deleteFile(coverFileName))
      }
    }

    if (coverResult?.thumbnailUrl) {
      const thumbFileName = this.extractFileNameFromUrl(coverResult.thumbnailUrl)
      if (thumbFileName) {
        cleanupPromises.push(minioService.deleteFile(thumbFileName))
      }
    }

    await Promise.allSettled(cleanupPromises)
  }

  extractFileNameFromUrl(url) {
    try {
      const urlObj = new URL(url)
      return urlObj.pathname.split('/').pop()
    } catch {
      return null
    }
  }

  /**
   * 获取用户视频列表
   * @param {number} userId - 用户ID
   * @param {number} page - 页码
   * @param {number} limit - 每页数量
   * @returns {Promise<Object>} 视频列表
   */
  async getUserVideos(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit

      const [videos, total] = await Promise.all([
        prisma.video.findMany({
          where: { userId, status: 1 },
          orderBy: { uploadTime: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            videoId: true,
            fileName: true,
            originalName: true,
            title: true,
            url: true,
            coverUrl: true,
            thumbnailUrl: true,
            duration: true,
            tags: true,
            category: true,
            description: true,
            difficulty: true,
            size: true,
            mimeType: true,
            uploadTime: true,
          },
        }),
        prisma.video.count({
          where: { userId, status: 1 },
        }),
      ])

      // 解析tags字段
      const processedVideos = videos.map((video) => ({
        ...video,
        tags: video.tags ? JSON.parse(video.tags) : [],
      }))

      return {
        success: true,
        data: {
          videos: processedVideos,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      }
    } catch (error) {
      console.error('Get user videos error:', error)
      throw error
    }
  }

  /**
   * 删除视频
   * @param {number} videoId - 视频ID
   * @param {number} userId - 用户ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteVideo(videoId, userId) {
    try {
      // 查找视频记录
      const video = await prisma.video.findFirst({
        where: { id: videoId, userId, status: 1 },
      })

      if (!video) {
        throw new Error('视频不存在或已删除')
      }

      // 从MinIO删除文件
      await minioService.deleteFile(video.fileName)

      // 软删除数据库记录
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 0, deleteTime: new Date() },
      })

      return {
        success: true,
        message: '删除成功',
      }
    } catch (error) {
      console.error('Delete video error:', error)
      throw error
    }
  }

  /**
   * 获取视频信息
   * @param {number} videoId - 视频ID
   * @param {number} userId - 用户ID
   * @returns {Promise<Object>} 视频信息
   */
  async getVideoInfo(videoId, userId) {
    try {
      const video = await prisma.video.findFirst({
        where: { id: videoId, userId, status: 1 },
      })

      if (!video) {
        throw new Error('视频不存在')
      }
      // 生成临时访问URL
      const tempUrl = await minioService.getFileUrl(video.fileName)

      return {
        success: true,
        data: {
          ...video,
          tempUrl,
        },
      }
    } catch (error) {
      console.error('Get video info error:', error)
      throw error
    }
  }
}

export default new UploadService()
