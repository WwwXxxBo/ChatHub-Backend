import express from 'express'
import { success } from '../utils/responses.js'
import MessageService from '../services/message-service.js'

const router = express.Router()
/**
 * 根据 assistantId 获取消息列表
 * GET /messages?assistantId=xxx
 */
router.get('/', async (req, res, next) => {
  try {
    const { assistantId } = req.query

    // 验证必要参数
    if (!assistantId) {
      return res.status(400).json({
        success: false,
        message: '助手ID不能为空',
        data: null,
      })
    }

    // 获取消息列表
    const messages = await MessageService.getMessageListByAssistantId(assistantId)
    success(res, '查询消息列表成功', { messages })
  } catch (error) {
    next(error)
  }
})

/**
 * 创建消息
 * POST /messages
 */
router.post('/', async (req, res, next) => {
  try {
    const messageData = req.body

    // 验证必要字段
    const requiredFields = ['messageId', 'assistantId', 'role', 'content']
    for (const field of requiredFields) {
      if (!messageData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field}字段不能为空`,
          data: null,
        })
      }
    }

    // 设置默认值
    const defaultValues = {
      name: '',
      type: 'text',
      image: '',
      createTime: Date.now(),
      status: 1,
    }

    // 合并数据
    const finalData = {
      ...defaultValues,
      ...messageData,
    }

    // 创建消息
    const data = await MessageService.createMessage(finalData)
    success(res, '创建消息成功', data)
  } catch (error) {
    // 处理唯一约束错误
    if (error.code === 'P2002') {
      const target = error.meta?.target
      let message = '创建失败，数据冲突'
      if (target && target.includes('messageId')) {
        message = 'messageId 已存在'
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
 * 删除单个消息（软删除）
 * DELETE /messages/:messageId
 */
router.delete('/:messageId', async (req, res, next) => {
  try {
    const { messageId } = req.params

    // 验证必要参数
    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: '消息ID不能为空',
        data: null,
      })
    }

    // 验证messageId格式
    if (typeof messageId !== 'string' || messageId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '消息ID格式不正确',
        data: null,
      })
    }

    // 执行软删除
    const data = await MessageService.deleteMessageByMessageId(messageId.trim())
    success(res, data.info || '删除消息成功', data)
  } catch (error) {
    // 处理特定错误
    if (error.message === '消息不存在') {
      return res.status(404).json({
        success: false,
        message: error.message,
        data: null,
      })
    }

    if (error.message === '消息已被删除') {
      return res.status(200).json({
        success: true,
        message: error.message,
        data: null,
      })
    }

    next(error)
  }
})

/**
 * 批量删除消息（根据messageId列表）
 * DELETE /messages/batch
 */
router.delete('/batch/delete', async (req, res, next) => {
  try {
    const { messageIds } = req.body

    // 验证必要参数
    if (!messageIds) {
      return res.status(400).json({
        success: false,
        message: 'messageIds不能为空',
        data: null,
      })
    }

    // 验证messageIds格式
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'messageIds必须是非空数组',
        data: null,
      })
    }

    // 验证数组中的每个元素
    const invalidMessageIds = messageIds.filter(
      (id) => typeof id !== 'string' || id.trim().length === 0,
    )

    if (invalidMessageIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `存在无效的messageId: ${invalidMessageIds.join(', ')}`,
        data: null,
      })
    }

    // 去除空格
    const trimmedMessageIds = messageIds.map((id) => id.trim())

    // 执行批量删除
    const data = await MessageService.deleteMessagesByMessageIds(trimmedMessageIds)

    // 如果部分消息未找到，返回200状态码但包含警告信息
    if (data.notFoundCount > 0) {
      success(res, data.info, data)
    } else {
      success(res, '批量删除消息成功', data)
    }
  } catch (error) {
    // 处理特定错误
    if (error.message === 'messageIds必须是非空数组') {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: null,
      })
    }

    if (error.message === '没有找到可删除的消息') {
      return res.status(404).json({
        success: false,
        message: error.message,
        data: null,
      })
    }

    next(error)
  }
})

export default router
