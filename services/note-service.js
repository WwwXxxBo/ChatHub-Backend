import prisma from '../prisma/prisma.js'

class NoteService {
  /**
   * 根据用户ID获取笔记列表
   * @param {number} userId - 用户ID
   * @returns {Promise<Array>} 笔记列表
   */
  async getNoteListByUserId(userId) {
    const condition = {
      where: {
        userId,
        status: 1,
      },
      orderBy: { id: 'desc' },
    }
    const notes = await prisma.note.findMany(condition)
    return notes
  }

  /**
   * 创建笔记
   * @param {Object} data - 笔记数据
   * @returns {Promise<Object>} 创建的笔记
   */
  async createNote(data) {
    const note = await prisma.note.create({
      data: {
        ...data,
        status: 1,
      },
    })
    return { note }
  }

  /**
   * 根据noteId删除笔记（软删除，将status设为0）
   * @param {string} noteId - 笔记唯一标识符
   * @returns {Promise<Object>} 更新后的笔记
   */
  async deleteNoteByNoteId(noteId) {
    const existingNote = await prisma.note.findFirst({
      where: {
        noteId: noteId,
      },
    })

    if (!existingNote) {
      throw new Error('笔记不存在')
    }
    if (existingNote.status === 0) {
      throw new Error('笔记已被删除')
    }
    const updatedNote = await prisma.note.update({
      where: {
        id: existingNote.id,
      },
      data: {
        status: 0,
        lastUpdateTime: Date.now(),
      },
    })

    return {
      note: updatedNote,
      message: '删除成功',
    }
  }

  /**
   * 根据noteId修改笔记信息
   * @param {string} noteId - 笔记唯一标识符
   * @param {Object} updateData - 要更新的数据
   * @returns {Promise<Object>} 更新后的笔记
   */
  async updateNoteByNoteId(noteId, updateData) {
    const existingNote = await prisma.note.findFirst({
      where: {
        noteId: noteId,
        status: 1,
      },
    })

    if (!existingNote) {
      throw new Error('笔记不存在或已被删除')
    }

    // 不允许修改的字段
    const disallowedFields = ['id', 'noteId', 'assistantId', 'userId', 'createTime', 'status']

    // 过滤掉不允许修改的字段
    const filteredUpdateData = Object.keys(updateData)
      .filter((key) => !disallowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key]
        return obj
      }, {})

    // 如果没有可更新的字段，直接返回
    if (Object.keys(filteredUpdateData).length === 0) {
      throw new Error('没有有效的更新字段')
    }

    // 添加更新时间戳
    filteredUpdateData.lastUpdateTime = Date.now()
    // 执行更新
    const updatedNote = await prisma.note.update({
      where: {
        id: existingNote.id,
      },
      data: filteredUpdateData,
    })
    return {
      note: updatedNote,
      message: '笔记修改成功',
    }
  }

  /**
   * 根据noteId获取笔记详情
   * @param {string} noteId - 笔记唯一标识符
   * @returns {Promise<Object>} 笔记详情
   */
  async getNoteByNoteId(noteId) {
    const note = await prisma.note.findFirst({
      where: {
        noteId: noteId,
        status: 1,
      },
    })

    if (!note) {
      throw new Error('笔记不存在')
    }

    return { note }
  }

  /**
   * 批量获取笔记（根据noteId列表）
   * @param {Array<string>} noteIds - 笔记ID列表
   * @returns {Promise<Array>} 笔记列表
   */
  async getNotesByIds(noteIds) {
    if (!Array.isArray(noteIds) || noteIds.length === 0) {
      return []
    }

    const notes = await prisma.note.findMany({
      where: {
        noteId: {
          in: noteIds,
        },
        status: 1,
      },
      orderBy: { id: 'desc' },
    })

    return notes
  }

  /**
   * 根据用户ID和类型获取笔记列表
   * @param {number} userId - 用户ID
   * @param {string} type - 笔记类型
   * @returns {Promise<Array>} 笔记列表
   */
  async getNotesByUserIdAndType(userId, type) {
    const condition = {
      where: {
        userId,
        type,
        status: 1,
      },
      orderBy: { id: 'desc' },
    }

    const notes = await prisma.note.findMany(condition)
    return notes
  }
}

export default new NoteService()
