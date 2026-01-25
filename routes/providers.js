import express from 'express'
import { success } from '../utils/responses.js'
import providerService from '../services/provider-service.js'

const router = express.Router()

/**
 * 查询Provider列表（根据用户ID）
 * GET /providers?userId=xxx
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req.query

    // 验证必要参数
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '用户ID不能为空',
        data: null,
      })
    }

    // 将userId转换为数字
    const userIdNumber = Number(userId)

    // 获取Provider列表
    const providers = await providerService.getProviderListByUserId(userIdNumber)

    success(res, '查询大模型API列表成功', { providers })
  } catch (error) {
    next(error)
  }
})

/**
 * 创建Provider
 * POST /providers
 */
router.post('/', async (req, res, next) => {
  try {
    const providerData = req.body

    // 验证必要字段
    const requiredFields = ['userId', 'providerId', 'provider']
    for (const field of requiredFields) {
      if (!providerData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field}字段不能为空`,
          data: null,
        })
      }
    }

    // 验证userId是否为数字
    providerData.userId = Number(providerData.userId)

    // 检查是否已存在相同provider
    const existingProvider = await providerService.getProviderByUserAndName(
      providerData.userId,
      providerData.provider,
    )

    if (existingProvider) {
      return res.status(400).json({
        success: false,
        message: '该大模型API Key已存在，请使用修改功能更新',
        data: null,
      })
    }

    // 创建Provider
    const data = await providerService.createProvider(providerData)
    success(res, '创建大模型API Key成功', data)
  } catch (error) {
    // 处理唯一约束错误
    if (error.code === 'P2002') {
      const target = error.meta?.target
      let message = '创建失败，数据冲突'
      if (target && target.includes('providerId')) {
        message = 'providerId 已存在'
      }
      return res.status(400).json({
        success: false,
        message,
        data: null,
      })
    }
    next(error)
  }
})

/**
 * 修改Provider信息
 * PUT /providers/:providerId
 */
router.put('/:providerId', async (req, res, next) => {
  try {
    const { providerId } = req.params
    const updateData = req.body

    // 验证必要参数
    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID不能为空',
        data: null,
      })
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '更新数据不能为空',
        data: null,
      })
    }

    // 执行修改
    const data = await providerService.updateProviderByProviderId(providerId.trim(), updateData)
    success(res, data.message || '修改大模型API Key成功', data)
  } catch (error) {
    // 处理特定错误
    if (error.message === '大模型API Key不存在') {
      return res.status(404).json({
        success: false,
        message: error.message,
        data: null,
      })
    }

    if (error.message === '没有有效的更新字段') {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: null,
      })
    }

    // 处理唯一约束错误
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: '修改失败，数据冲突',
        data: null,
      })
    }

    next(error)
  }
})

export default router
