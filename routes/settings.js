import express from 'express'
import { success } from '../utils/responses.js'
import settingService from '../services/setting-service.js'

const router = express.Router()

/**
 * 获取用户设置
 * GET /settings?userId=xxx
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

    if (isNaN(userIdNumber)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式不正确',
        data: null,
      })
    }

    // 获取用户设置
    const data = await settingService.getSettingByUserId(userIdNumber)

    if (data.setting === null) {
      success(res, '用户设置不存在', { setting: null })
    } else {
      success(res, '获取用户设置成功', data)
    }
  } catch (error) {
    next(error)
  }
})

/**
 * 创建设置
 * POST /settings
 */
router.post('/', async (req, res, next) => {
  try {
    const settingData = req.body

    // 验证必要字段
    const requiredFields = ['userId']
    for (const field of requiredFields) {
      if (!settingData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field}字段不能为空`,
          data: null,
        })
      }
    }

    // 验证userId是否为数字
    settingData.userId = Number(settingData.userId)

    if (isNaN(settingData.userId)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式不正确',
        data: null,
      })
    }

    // 创建设置
    const data = await settingService.createSetting(settingData)
    success(res, '创建设置成功', data)
  } catch (error) {
    // 处理特定错误
    if (error.message === '用户已存在设置，请使用更新接口') {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: null,
      })
    }

    // 处理唯一约束错误
    if (error.code === 'P2002') {
      const target = error.meta?.target
      let message = '创建失败，数据冲突'
      if (target && target.includes('userId')) {
        message = '该用户已存在设置'
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
 * 修改设置
 * PUT /settings/:userId
 */
router.put('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params
    const updateData = req.body

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

    if (isNaN(userIdNumber)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式不正确',
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
    const data = await settingService.updateSettingByUserId(userIdNumber, updateData)
    success(res, data.message || '修改设置成功', data)
  } catch (error) {
    // 处理特定错误
    if (error.message === '用户设置不存在，请先创建设置') {
      return res.status(404).json({
        success: false,
        message: error.message,
        data: null,
      })
    }

    // 处理唯一约束错误
    if (error.code === 'P2002') {
      const target = error.meta?.target
      let message = '修改失败，数据冲突'
      return res.status(400).json({
        success: false,
        message,
        data: null,
      })
    }

    next(error)
  }
})

export default router
