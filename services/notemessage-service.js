import prisma from '../prisma/prisma.js'

class NoteMessageService {
  /**
   * 根据 noteId 获取笔记消息列表
   * @param {string} noteId - 笔记ID
   * @returns {Promise<Array>} 笔记消息列表
   */
  async getNoteMessageListByNoteId(noteId) {
    // 构建查询条件
    const condition = {
      where: {
        noteId,
        status: 1, // 只返回状态为1的消息
      },
      orderBy: { id: 'asc' },
    }

    // 查询该笔记的消息
    const messages = await prisma.noteMessage.findMany(condition)
    return messages
  }

  /**
   * 创建笔记消息
   * @param {Object} data - 笔记消息数据
   * @returns {Promise<Object>} 创建的笔记消息
   */
  async createNoteMessage(data) {
    const message = await prisma.noteMessage.create({
      data: {
        ...data,
        status: 1,
      },
    })
    return { message }
  }

  /**
   * 根据 noteId 删除所有相关笔记消息（软删除，将status设为0）
   * @param {string} noteId - 笔记ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteNoteMessagesByNoteId(noteId) {
    // 先检查该笔记下面是否有消息
    const existingMessages = await prisma.noteMessage.findMany({
      where: {
        noteId,
        status: 1,
      },
      select: {
        id: true,
      },
    })

    if (existingMessages.length === 0) {
      return {
        count: 0,
        info: '该笔记下没有找到可删除的消息',
        noteId: noteId,
      }
    }
    // 批量软删除，将status设为0
    const result = await prisma.noteMessage.updateMany({
      where: {
        noteId,
        status: 1,
      },
      data: {
        status: 0,
      },
    })

    return {
      count: result.count,
      info: `成功删除 ${result.count} 条笔记消息`,
      noteId: noteId,
    }
  }
}

export default new NoteMessageService()
