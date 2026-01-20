import prisma from '../prisma/prisma.js'

class MessageService {
  /**
   * 根据 assistantId 获取消息列表
   * @param {string} assistantId - 助手ID
   * @returns {Promise<Array>} 消息列表
   */
  async getMessageListByAssistantId(assistantId) {
    // 构建查询条件
    const condition = {
      where: {
        assistantId,
        status: 1, // 只返回状态为1的消息
      },
      orderBy: { id: 'asc' }, // 按创建顺序返回
    }

    // 查询该助手的消息
    const messages = await prisma.message.findMany(condition)
    return messages
  }

  /**
   * 创建消息
   * @param {Object} data - 消息数据
   * @returns {Promise<Object>} 创建的消息
   */
  async createMessage(data) {
    const message = await prisma.message.create({
      data: {
        ...data,
        status: 1,
      },
    })
    return { message }
  }

  /**
   * 根据 messageId 删除消息（软删除，将status设为0）
   * @param {string} messageId - 消息唯一标识符
   * @returns {Promise<Object>} 更新后的消息
   */
  async deleteMessageByMessageId(messageId) {
    // 先检查消息是否存在
    const existingMessage = await prisma.message.findFirst({
      where: {
        messageId: messageId,
      },
    })
    if (!existingMessage) {
      throw new Error('消息不存在')
    }
    // 如果消息已经被删除(ststus=0)，返回相应信息
    if (existingMessage.status === 0) {
      throw new Error('消息已经被删除')
    }
    // 执行软删除，将status设置为0
    const updateMessage = await prisma.message.update({
      where: {
        id: existingMessage.id, // 使用数据库中的主键id
      },
      data: {
        status: 0,
      },
    })

    return {
      message: updateMessage,
      info: '删除成功',
    }
  }

  /**
   * 批量删除消息（根据assistantId）
   * @param {string} assistantId - 助手ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteMessagesByAssistantId(messageIds) {
    // 验证输入参数
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new Error('messageIds必须是非空数组')
    }
    // 先检查这些消息是否存在且未删除
    const existingMessages = await prisma.message.findMany({
      where: {
        messageId: {
          in: messageIds,
        },
        status: 1,
      },
      select: {
        messageId: true,
      },
    })
    if (existingMessages.length === 0) {
      throw new Error('没有找到可删除的消息')
    }
    // 获取实际存在的messageId
    const existingMessageIds = existingMessages.map((msg) => msg.messageId)
    // 批量软删除，将status设为0
    const result = await prisma.message.updateMany({
      where: {
        messageId: {
          in: existingMessageIds,
        },
        status: 1,
      },
      data: {
        status: 0,
      },
    })
    // 检查是否有部分messageId不存在
    const deletedCount = result.count
    const notFoundCount = messageIds.length - existingMessageIds.length
    let info = `成功删除 ${deletedCount} 条消息`
    if (notFoundCount > 0) {
      info += `，${notFoundCount} 条消息未找到或已被删除`
    }
    return {
      count: deletedCount,
      notFoundCount,
      info,
      deletedMessageIds: existingMessageIds,
    }
  }
}

export default new MessageService()
