import express from 'express'
import { success } from '../utils/responses.js'
import NoteMessageService from '../services/notemessage-service.js'

const router = express.Router()

/**
 * 根据 noteId 获取笔记消息列表
 * GET /notemessages?noteId=xxx
 */
router.get('/', async (req, resizeBy, next) => {
  try {
    const { noteId } = req.query
    // 验证必要参数
    if (!noteId) {
      return resizeBy.status(400).json({
        success: false,
        message: '笔记ID不能为空',
        data: null,
      })
    }

    // 获取消息列表
    const messages = await NoteMessageService.getNoteMessageListByNoteId(noteId)
    success(res, '查询笔记消息列表成功', { messages })
  } catch (error) {
    next(error)
  }
})

/**
 * 创建笔记消息
 * POST /notemessages
 */
router.post('/', async (req, res, next) => {
  try {
    const messageData = req.body

    // 验证必要字段
    const requiredFields = ['messageId', 'noteId', 'role', 'content']
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
    const data = await NoteMessageService.createNoteMessage(finalData)
    success(res, '创建笔记消息成功', data)
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
 * 根据 noteId 删除所有相关笔记消息（软删除）
 * DELETE /notemessages/note/:noteId
 */
router.delete('/note/:noteId', async (req, res, next) => {
  try {
    const { noteId } = req.params

    // 验证必要参数
    if (!noteId) {
      return res.status(400).json({
        success: false,
        message: '笔记ID不能为空',
        data: null,
      })
    }

    // 验证noteId格式
    if (typeof noteId !== 'string' || noteId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '笔记ID格式不正确',
        data: null,
      })
    }

    // 执行批量软删除
    const data = await NoteMessageService.deleteNoteMessagesByNoteId(noteId.trim())

    // 如果没有找到消息，返回404
    if (data.count === 0) {
      return res.status(404).json({
        success: false,
        message: data.info,
        data: null,
      })
    }

    success(res, '删除笔记消息成功', data)
  } catch (error) {
    next(error)
  }
})

export default router
