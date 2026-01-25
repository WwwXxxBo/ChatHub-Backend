import prisma from '../prisma/prisma.js'

class SettingService {
  /**
   * 根据用户ID获取设置
   * @param {number} userId - 用户ID
   * @returns {Promise<Object>} 用户设置
   */
  async getSettingByUserId(userId) {
    // 查找用户的设置
    const setting = await prisma.setting.findFirst({
      where: {
        userId: userId,
      },
    })

    if (!setting) {
      return { setting: null }
    }

    return { setting }
  }

  /**
   * 创建设置
   * @param {Object} data - 设置数据
   * @returns {Promise<Object>} 创建的用户设置
   */
  async createSetting(data) {
    // 检查用户是否已经存在设置
    const existingSetting = await prisma.setting.findFirst({
      where: {
        userId: data.userId,
      },
    })

    if (existingSetting) {
      throw new Error('用户已存在设置，请使用更新接口')
    }

    const setting = await prisma.setting.create({
      data,
    })

    return { setting }
  }

  /**
   * 修改设置
   * @param {number} userId - 用户ID
   * @param {Object} updateData - 要更新的数据
   * @returns {Promise<Object>} 更新后的设置
   */
  async updateSettingByUserId(userId, updateData) {
    // 查找用户的设置
    const existingSetting = await prisma.setting.findFirst({
      where: {
        userId: userId,
      },
    })
    // 如果设置不存在，返回错误
    if (!existingSetting) {
      throw new Error('用户设置不存在，请先创建设置')
    }

    // 不允许修改的字段
    const disallowedFields = ['id', 'userId', 'settingId']
    // 过滤掉不允许修改的字段
    const filteredUpdateData = Object.keys(updateData)
      .filter((key) => !disallowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key]
        return obj
      }, {})

    // 如果没有可更新的字段，直接返回原设置
    if (Object.keys(filteredUpdateData).length === 0) {
      return { setting: existingSetting }
    }

    // 执行更新
    const updatedSetting = await prisma.setting.update({
      where: {
        id: existingSetting.id,
      },
      data: filteredUpdateData,
    })

    return {
      setting: updatedSetting,
      message: '设置更新成功',
    }
  }
}

export default new SettingService()
