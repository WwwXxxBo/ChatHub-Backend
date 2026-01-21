import express from 'express'
import { success } from '../utils/responses.js'
import noteService from '../services/note-service.js'

const router = express.Router()

/**
 * 查询笔记列表（根据用户ID）
 * GET /notes?userId=xxx&type=xxx
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId, type } = req.query

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

    let notes
    if (type) {
      // 如果提供了类型，则按类型筛选
      notes = await noteService.getNotesByUserIdAndType(userIdNumber, type)
    } else {
      // 否则获取所有笔记
      notes = await noteService.getNoteListByUserId(userIdNumber)
    }

    success(res, '查询笔记列表成功', { notes })
  } catch (error) {
    next(error)
  }
})

/**
 * 创建笔记
 * POST /notes
 */
router.post('/', async (req, res, next) => {
  try {
    const noteData = req.body

    // 验证必要字段
    const requiredFields = ['userId', 'noteId', 'name', 'type', 'provider', 'model']
    for (const field of requiredFields) {
      if (!noteData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field}字段不能为空`,
          data: null,
        })
      }
    }

    // 验证userId是否为数字
    noteData.userId = Number(noteData.userId)

    // 使用时间戳（毫秒级）
    const currentTimestamp = Date.now()

    // 设置默认值
    const defaultValues = {
      inputMaxTokens: 4096,
      maxTokens: 4096,
      contextSize: 4096,
      status: 1,
      instruction: '',
      createTime: currentTimestamp,
      lastUpdateTime: currentTimestamp,
    }

    // 合并数据，移除前端可能传来的时间戳
    const {
      createTime: clientCreateTime,
      lastUpdateTime: clientLastUpdateTime,
      ...restData
    } = noteData

    const finalData = {
      ...defaultValues,
      ...restData,
      userId: noteData.userId,
    }

    // 创建笔记
    const data = await noteService.createNote(finalData)
    success(res, '创建笔记成功', data)
  } catch (error) {
    // 处理唯一约束错误
    if (error.code === 'P2002') {
      const target = error.meta?.target
      let message = '创建失败，数据冲突'
      if (target && target.includes('noteId')) {
        message = 'noteId 已存在'
      } else if (target && target.includes('name')) {
        message = '笔记名称已存在'
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
 * 删除笔记（软删除，将status变为0）
 * DELETE /notes/:noteId
 */
router.delete('/:noteId', async (req, res, next) => {
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

    // 执行软删除
    const data = await noteService.deleteNoteByNoteId(noteId.trim())

    success(res, data.message || '删除笔记成功', data)
  } catch (error) {
    // 处理特定错误
    if (error.message === '笔记不存在') {
      return res.status(404).json({
        success: false,
        message: error.message,
        data: null,
      })
    }

    if (error.message === '笔记已被删除') {
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
 * 获取笔记详情
 * GET /notes/:noteId
 */
router.get('/:noteId', async (req, res, next) => {
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

    // 获取笔记详情
    const data = await noteService.getNoteByNoteId(noteId.trim())
    success(res, '获取笔记详情成功', data)
  } catch (error) {
    if (error.message === '笔记不存在') {
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
 * 修改笔记信息
 * PUT /notes/:noteId
 */
router.put('/:noteId', async (req, res, next) => {
  try {
    const { noteId } = req.params
    const updateData = req.body

    // 验证必要参数
    if (!noteId) {
      return res.status(400).json({
        success: false,
        message: '笔记ID不能为空',
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
    const data = await noteService.updateNoteByNoteId(noteId.trim(), updateData)
    success(res, data.message || '修改笔记成功', data)
  } catch (error) {
    // 处理特定错误
    if (error.message === '笔记不存在或已被删除') {
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
      const target = error.meta?.target
      let message = '修改失败，数据冲突'
      if (target && target.includes('name')) {
        message = '笔记名称已存在，请使用其他名称'
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
 * 批量获取笔记信息
 * POST /notes/batch
 */
router.post('/batch', async (req, res, next) => {
  try {
    const { noteIds } = req.body

    // 验证必要参数
    if (!noteIds) {
      return res.status(400).json({
        success: false,
        message: 'noteIds不能为空',
        data: null,
      })
    }

    // 验证noteIds格式
    if (!Array.isArray(noteIds) || noteIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'noteIds必须是非空数组',
        data: null,
      })
    }

    // 验证数组中的每个元素
    const invalidNoteIds = noteIds.filter((id) => typeof id !== 'string' || id.trim().length === 0)

    if (invalidNoteIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `存在无效的noteId: ${invalidNoteIds.join(', ')}`,
        data: null,
      })
    }

    // 去除空格
    const trimmedNoteIds = noteIds.map((id) => id.trim())

    // 批量获取笔记信息
    const notes = await noteService.getNotesByIds(trimmedNoteIds)

    success(res, '批量获取笔记成功', { notes })
  } catch (error) {
    next(error)
  }
})

export default router
