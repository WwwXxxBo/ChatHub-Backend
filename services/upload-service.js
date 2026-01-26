import minioService from './minio-service.js'
import prisma from '../prisma/prisma.js'

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

    try {
      // 验证videoId格式
      if (!videoId || typeof videoId !== 'string') {
        throw new Error('无效的videoId')
      }

      console.log('开始上传文件到MinIO...')

      // 使用MinIO服务上传文件
      uploadResult = await minioService.uploadFile(file, 'videos')

      console.log('MinIO上传成功:', {
        fileName: uploadResult.fileName,
        url: uploadResult.url,
        size: uploadResult.size,
      })

      // 确保数据类型正确
      const userIdNumber = parseInt(userId)

      // 检查videoId是否已存在
      const existingVideo = await prisma.video.findUnique({
        where: { videoId: videoId },
      })

      if (existingVideo) {
        throw new Error(`videoId ${videoId} 已存在`)
      }

      // 准备数据库数据
      const dbData = {
        videoId: videoId,
        userId: userIdNumber,
        fileName: uploadResult.fileName,
        originalName: file.originalname,
        url: uploadResult.url, // 这里应该是字符串，不是数组
        size: parseInt(uploadResult.size),
        mimeType: file.mimetype,
        bucket: uploadResult.bucket,
        metadata: JSON.stringify({
          ...metadata,
          uploadMethod: 'frontend-generated-id',
          clientIp: metadata.ip,
          userAgent: metadata.userAgent,
        }),
        uploadTime: new Date(),
        status: 1,
      }

      console.log('准备保存到数据库的数据:', {
        videoId: dbData.videoId,
        userId: dbData.userId,
        fileName: dbData.fileName,
        urlType: typeof dbData.url,
        url: dbData.url,
        metadata: dbData.metadata,
      })

      // 保存到数据库
      const videoRecord = await prisma.video.create({
        data: dbData,
      })

      console.log('视频记录创建成功:', {
        id: videoRecord.id,
        videoId: videoRecord.videoId,
        userId: videoRecord.userId,
      })

      return {
        success: true,
        data: {
          ...uploadResult,
          id: videoRecord.id,
          videoId: videoRecord.videoId,
          originalName: file.originalname,
          mimeType: file.mimetype,
          uploadTime: videoRecord.uploadTime,
        },
        message: '上传成功',
      }
    } catch (error) {
      console.error('Upload service error:', error.message)
      console.error('完整错误:', error)

      // 清理上传的文件（如果数据库保存失败）
      if (uploadResult?.fileName) {
        try {
          console.log('清理上传的文件:', uploadResult.fileName)
          await minioService.deleteFile(uploadResult.fileName)
          console.log('文件清理成功')
        } catch (cleanupError) {
          console.error('清理上传文件失败:', cleanupError.message)
        }
      }

      throw error
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
