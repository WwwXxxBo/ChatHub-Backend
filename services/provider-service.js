import prisma from '../prisma/prisma.js'

class ProviderService {
  /**
   * 根据用户ID获取Provider列表
   * @param {number} userId - 用户ID
   * @returns {Promise<Array>} Provider列表
   */
  async getProviderListByUserId(userId) {
    const providers = await prisma.provider.findMany({
      where: {
        userId,
      },
      orderBy: { id: 'desc' },
    })
    return providers
  }

  /**
   * 创建Provider
   * @param {Object} data - Provider数据
   * @returns {Promise<Object>} 创建的Provider
   */
  async createProvider(data) {
    // 检查是否已存在相同的provider（同一个用户不能添加重复的provider类型）
    const existingProvider = await prisma.provider.findFirst({
      where: {
        userId: data.userId,
        provider: data.provider,
      },
    })

    if (existingProvider) {
      throw new Error(`已存在 ${data.provider} 类型的大模型API Key，请勿重复添加`)
    }

    const provider = await prisma.provider.create({
      data,
    })

    return { provider }
  }

  /**
   * 根据providerId修改Provider信息
   * @param {string} providerId - Provider唯一标识符
   * @param {Object} updateData - 要更新的数据
   * @returns {Promise<Object>} 更新后的Provider
   */
  async updateProviderByProviderId(providerId, updateData) {
    const existingProvider = await prisma.provider.findFirst({
      where: {
        providerId: providerId,
      },
    })

    if (!existingProvider) {
      throw new Error('大模型API Key不存在')
    }

    // 不允许修改的字段
    const disallowedFields = ['id', 'providerId', 'userId']

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

    // 执行更新
    const updatedProvider = await prisma.provider.update({
      where: {
        id: existingProvider.id,
      },
      data: filteredUpdateData,
    })

    return {
      provider: updatedProvider,
      message: '大模型API Key修改成功',
    }
  }

  /**
   * 根据provider和userId检查Provider是否存在
   * @param {number} userId - 用户ID
   * @param {string} provider - 提供商名称
   * @returns {Promise<Object|null>} 存在的Provider或null
   */
  async getProviderByUserAndName(userId, provider) {
    const existingProvider = await prisma.provider.findFirst({
      where: {
        userId: userId,
        provider: provider,
      },
    })

    return existingProvider
  }
}
export default new ProviderService()
