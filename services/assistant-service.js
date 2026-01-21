import prisma from '../prisma/prisma.js'

class AssistantService {
  /**
   * 根据用户ID获取助手列表
   * @param {number} userId - 用户ID
   * @returns {Promise<Array>} 助手列表
   */
  async getAssistantListByUserId(userId) {
    // 构建查询条件
    const condition = {
      where: {
        userId,
        status: 1, // 增加status为1的条件
      },
      orderBy: { id: 'desc' },
    }
    // 查询该用户的所有助手
    const assistants = await prisma.assistant.findMany(condition)
    return assistants
  }

  /**
   * 创建助手
   * @param {Object} data - 助手数据
   * @returns {Promise<Object>} 创建的助手
   */
  async createAssistant(data) {
    const assistant = await prisma.assistant.create({
      data: {
        ...data,
        status: 1,
      },
    })
    return { assistant }
  }

  /**
   * 根据assistantId删除助手（软删除，将status设为0）
   * @param {string} assistantId - 助手唯一标识符
   * @returns {Promise<Object>} 更新后的助手
   */
  async deleteAssistantByAssistantId(assistantId) {
    // 先检查助手是否存在
    const existingAssistant = await prisma.assistant.findFirst({
      where: {
        assistantId: assistantId,
      },
    })

    if (!existingAssistant) {
      throw new Error('助手不存在')
    }

    // 如果助手已经被删除（status=0），返回相应信息
    if (existingAssistant.status === 0) {
      throw new Error('助手已被删除')
    }

    // 执行软删除，将status设为0
    const updatedAssistant = await prisma.assistant.update({
      where: {
        id: existingAssistant.id, // 使用数据库中的主键id
      },
      data: {
        status: 0,
        lastUpdateTime: Date.now(), // 更新最后修改时间
      },
    })

    return {
      assistant: updatedAssistant,
      message: '删除成功',
    }
  }

  /**
   * 根据assistantId修改助手信息
   * @param {string} assistantId - 助手唯一标识符
   * @param {Object} updateData - 要更新的数据
   * @returns {Promise<Object>} 更新后的助手
   */
  async updateAssistantByAssistantId(assistantId, updateData) {
    const existingAssistant = await prisma.assistant.findFirst({
      where: {
        assistantId: assistantId,
        status: 1, // 只允许修改未删除的助手
      },
    })
    if (!existingAssistant) {
      throw new Error('助手不存在或已被删除')
    }
    // 不允许修改的字段
    const disallowedFields = ['id', 'assistantId', 'userId', 'createTime', 'status']
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
    const updatedAssistant = await prisma.assistant.update({
      where: {
        id: existingAssistant.id, // 使用数据库中的主键id
      },
      data: filteredUpdateData,
    })
    return {
      assistant: updatedAssistant,
      message: '聊天助手修改成功',
    }
  }

  /**
   * 根据assistantId获取助手详情
   * @param {string} assistantId - 助手唯一标识符
   * @returns {Promise<Object>} 助手详情
   */
  async getAssistantByAssistantId(assistantId) {
    // 查找助手
    const assistant = await prisma.assistant.findFirst({
      where: {
        assistantId: assistantId,
        status: 1, // 只查找未删除的助手
      },
    })
    if (!assistant) {
      throw new Error('助手不存在')
    }
    return { assistant }
  }

  /**
   * 批量获取助手（根据assistantId列表）
   * @param {Array<string>} assistantIds - 助手ID列表
   * @returns {Promise<Array>} 助手列表
   */
  async getAssistantsByIds(assistantIds) {
    if (!Array.isArray(assistantIds) || assistantIds.length === 0) {
      return []
    }
    const assistants = await prisma.assistant.findMany({
      where: {
        assistantId: {
          in: assistantIds,
        },
        status: 1,
      },
      orderBy: { id: 'desc' },
    })
    return assistants
  }
}

export default new AssistantService()
