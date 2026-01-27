import express from 'express'
import { upload, memoryUpload } from '../config/upload.config.js'
import uploadService from '../services/upload-service.js'
import { success } from '../utils/responses.js'

const router = express.Router()

/**
 * 上传单个视频文件
 * POST /upload/video
 */
router.post('/video', memoryUpload.single('video'), async (req, res, next) => {
  try {
    // 验证用户身份
    const userId = req.body.userId
    const videoId = req.body.videoId

    console.log('请求体内容:', req.body)
    console.log('文件信息:', req.file)

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
        data: null,
      })
    }

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: 'videoId不能为空',
        data: null,
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的视频文件',
        data: null,
      })
    }

    console.log('收到上传请求:', {
      userId: userId,
      videoId: videoId,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    })

    // 解析tags（如果是JSON字符串）
    let tags = []
    try {
      if (req.body.tags) {
        tags = JSON.parse(req.body.tags)
      }
    } catch (e) {
      console.warn('解析tags失败:', e.message)
    }

    // 提取额外的表单数据
    const metadata = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      title: req.body.title || req.file.originalname,
      category: req.body.category || 'other',
      tags: tags,
      description: req.body.description,
      videoId: videoId,
    }

    console.log('处理后的元数据:', metadata)

    // 调用上传服务
    const result = await uploadService.uploadVideo(req.file, parseInt(userId), videoId, metadata)

    console.log('上传服务返回:', result)

    // 返回格式化响应
    res.json({
      success: true,
      message: result.message,
      data: {
        id: result.data.id,
        videoId: result.data.videoId,
        fileName: result.data.originalName,
        url: result.data.url,
        size: result.data.size,
        mimeType: result.data.mimeType,
        title: metadata.title,
        category: metadata.category,
        tags: metadata.tags,
        description: metadata.description,
        uploadTime: result.data.uploadTime,
      },
    })
  } catch (error) {
    console.error('上传路由错误:', error.message)
    console.error('完整错误:', error)

    // 处理特定错误
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: '视频ID已存在，请重新生成',
        data: null,
      })
    }

    if (error.message.includes('metaData') || error.message.includes('metadata')) {
      return res.status(400).json({
        success: false,
        message: '数据库字段配置错误',
        data: null,
      })
    }

    if (error.message.includes('videoId')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: null,
      })
    }

    res.status(500).json({
      success: false,
      message: '上传失败: ' + error.message,
      data: null,
    })
  }
})

/**
 * 上传多个视频文件
 * POST /upload/videos
 */
router.post('/videos', memoryUpload.array('videos', 10), async (req, res, next) => {
  try {
    const userId = req.user?.id || req.body.userId || 1
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
        data: null,
      })
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的视频文件',
        data: null,
      })
    }

    // 批量上传
    const uploadPromises = req.files.map((file) => uploadService.uploadVideo(file, userId))
    const results = await Promise.all(uploadPromises)
    success(res, '批量上传完成', {
      total: req.files.length,
      successCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      results,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 获取用户视频列表
 * GET /upload/videos
 */
router.get('/videos', async (req, res, next) => {
  try {
    const userId = Number(req.user?.id || req.query.userId || 1)
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    const result = await uploadService.getUserVideos(userId, page, limit)
    success(res, '获取视频列表成功', result.data)
  } catch (error) {
    next(error)
  }
})

/**
 * 获取视频信息
 * GET /upload/video/:id
 */
router.get('/video/:id', async (req, res, next) => {
  try {
    const userId = req.user?.id || req.query.userId || 1
    const videoId = parseInt(req.params.id)

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: '视频ID不能为空',
        data: null,
      })
    }

    const result = await uploadService.getVideoInfo(videoId, userId)
    success(res, '获取视频信息成功', result.data)
  } catch (error) {
    if (error.message === '视频不存在') {
      return res.status(404).json({
        success: false,
        message: error.message,
        data: null,
      })
    }
    next(error)
  }
})

/**
 * 删除视频
 * DELETE /upload/video/:id
 */
router.delete('/video/:id', async (req, res, next) => {
  try {
    const userId = req.user?.id || req.body.userId || 1
    const videoId = parseInt(req.params.id)

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: '视频ID不能为空',
        data: null,
      })
    }

    const result = await uploadService.deleteVideo(videoId, userId)
    success(res, result.message)
  } catch (error) {
    if (error.message === '视频不存在或已删除') {
      return res.status(404).json({
        success: false,
        message: error.message,
        data: null,
      })
    }
    next(error)
  }
})

/**
 * 检查上传进度（如果需要分片上传）
 * GET /upload/progress/:uploadId
 */
router.get('/progress/:uploadId', (req, res) => {
  // 这里可以实现分片上传的进度查询
  res.json({
    success: true,
    data: {
      uploadId: req.params.uploadId,
      progress: 0,
      status: 'pending',
    },
  })
})

export default router
