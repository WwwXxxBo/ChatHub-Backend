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
      )

      // 3. 保存到数据库
      const dbData = {
        videoId: videoId,
        userId: parseInt(userId),
        fileName: uploadResult.fileName,
        originalName: file.originalname,
        url: uploadResult.url,
        coverUrl: coverResult.coverUrl,
        thumbnailUrl: coverResult.thumbnailUrl,
        size: parseInt(uploadResult.size),
        mimeType: file.mimetype,
        bucket: uploadResult.bucket,
        metadata: JSON.stringify({
          ...metadata,
          duration: metadata.duration || 0,
          dimensions: metadata.dimensions || '1920x1080',
          uploadMethod: 'auto-generated-thumbnails',
        }),
        uploadTime: new Date(),
        tags: '',
        difficulty: '',
        status: 1,
      }

      const videoRecord = await prisma.video.create({
        data: dbData,
      })

      return {
        status: true,
        data: {
          id: videoRecord.id,
          videoId: videoRecord.videoId,
          fileName: file.originalname,
          url: uploadResult.url,
          coverUrl: coverResult.coverUrl,
          thumbnailUrl: coverResult.thumbnailUrl,
          size: uploadResult.size,
          mimeType: file.mimetype,
          title: metadata.title,
          category: metadata.category,
          tags: metadata.tags,
          description: metadata.description,
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
        }),
        prisma.video.count({
          where: { userId, status: 1 },
        }),
      ])

      return {
        success: true,
        data: {
          videos,
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
