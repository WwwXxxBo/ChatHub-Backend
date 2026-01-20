import express from 'express'
import { success } from '../utils/responses.js'
import assistantService from '../services/assistant-service.js'

const router = express.Router()

/**
 * 查询助手列表（根据用户ID）
 * GET /assistants?userId=xxx
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
    // 获取助手列表
    const assistants = await assistantService.getAssistantListByUserId(userIdNumber)
    success(res, '查询助手列表成功', { assistants })
  } catch (error) {
    next(error)
  }
})

/**
 * 创建助手
 * POST /assistants
 */
router.post('/', async (req, res, next) => {
  try {
    const assistantData = req.body

    // 验证必要字段
    const requiredFields = ['userId', 'assistantId', 'name', 'type', 'provider', 'model']
    for (const field of requiredFields) {
      if (!assistantData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field}字段不能为空`,
          data: null,
        })
      }
    }

    // 验证userId是否为数字
    assistantData.userId = Number(assistantData.userId)

    // 使用时间戳（毫秒级）
    const currentTimestamp = Date.now()

    // 设置默认值（根据实际的数据库模型）
    const defaultValues = {
      inputMaxTokens: 4096,
      maxTokens: 4096,
      contextSize: 4096,
      status: 1,
      instruction: '',
      createTime: currentTimestamp, // 改为时间戳格式
      lastUpdateTime: currentTimestamp, // 改为时间戳格式
    }

    // 合并数据，移除前端可能传来的时间戳
    const {
      createTime: clientCreateTime,
      lastUpdateTime: clientLastUpdateTime,
      ...restData
    } = assistantData

    const finalData = {
      ...defaultValues,
      ...restData,
      userId: assistantData.userId,
    }

    // 创建助手
    const data = await assistantService.createAssistant(finalData)
    success(res, '创建助手成功', data)
  } catch (error) {
    // 处理唯一约束错误
    if (error.code === 'P2002') {
      const target = error.meta?.target
      let message = '创建失败，数据冲突'
      if (target && target.includes('assistantId')) {
        message = 'assistantId 已存在'
      } else if (target && target.includes('name')) {
        message = '助手名称已存在'
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
 * 删除助手（软删除，将status变为0）
 * DELETE /assistants/:assistantId
 * 注意：只需要assistantId，不需要userId
 */
router.delete('/:assistantId', async (req, res, next) => {
  try {
    const { assistantId } = req.params // assistantId是字符串

    // 验证必要参数
    if (!assistantId) {
      return res.status(400).json({
        success: false,
        message: '助手ID不能为空',
        data: null,
      })
    }

    // 验证assistantId格式
    if (typeof assistantId !== 'string' || assistantId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '助手ID格式不正确',
        data: null,
      })
    }

    // 执行软删除
    const data = await assistantService.deleteAssistantByAssistantId(
      assistantId.trim(), // 去除前后空格
    )

    success(res, data.message || '删除助手成功', data)
  } catch (error) {
    // 处理特定错误
    if (error.message === '助手不存在') {
      return res.status(404).json({
        success: false,
        message: error.message,
        data: null,
      })
    }

    if (error.message === '助手已被删除') {
      return res.status(200).json({
        success: true,
        message: error.message,
        data: null,
      })
    }

    next(error)
  }
})

export default router
