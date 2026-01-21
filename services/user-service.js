import prisma from '../prisma/prisma.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { validateSignUp, validateSignIn } from '../validations/auth-validation.js'
import createError from 'http-errors'
const { BadRequest, NotFound, Unauthorized } = createError

class UserService {
  /**
   * 获取用户列表
   * @param {Object} options - 查询选项
   * @param {Object} options.where - 查询条件
   * @param {number} options.skip - 跳过的记录数
   * @param {number} options.take - 获取的记录数
   * @param {Object} options.orderBy - 排序方式
   * @returns {Promise<Object>} 用户列表和分页信息
   */
  async getUserList(options = {}) {
    const { where = {}, skip = 0, take = 10, orderBy = { id: 'desc' } } = options
    // 获取总记录数
    const total = await prisma.user.count({ where })
    // 获取用户列表
    const users = await prisma.user.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
      },
    })
    return {
      users,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    }
  }

  /**
   * 创建用户
   * @param {Object} data - 用户数据
   * @returns {Promise<Object>} 创建的用户
   */
  async createUser(data) {
    // 验证注册数据
    const validatedData = validateSignUp(data)

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { name: validatedData.name },
    })
    if (existingUser) throw new BadRequest('用户名已存在')

    // 检查手机号是否已存在
    const existingPhone = await prisma.user.findUnique({
      where: { phone: validatedData.phone },
    })

    if (existingPhone) throw new BadRequest('手机号已存在，请直接登录')

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })
    if (existingEmail) throw new BadRequest('邮箱已存在，请直接登录')
    if (existingEmail) throw new BadRequest('邮箱已存在，请直接登录')

    // 加密密码
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        ...validatedData,
        password: hashedPassword,
      },
    })

    // 生成 JWT token
    const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.SECRET,
      {
        expiresIn: '7d',
      },
    )

    return { token }
  }

  /**
   * 用户登录
   * @param {Object} data - 用户登录数据
   * @returns {Promise<Object>} 登录成功后的token
   */
  async signInUser(data) {
    // 验证登录数据
    const validatedData = validateSignIn(data)
    // 查找用户
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.login },
          { name: validatedData.login },
          { phone: validatedData.login },
        ],
      },
    })

    if (!user) {
      throw new Unauthorized('用户不存在，请先注册后再登录')
    }

    if (user.deleted) {
      throw new Unauthorized('用户已注销，请注册新账号后再登录')
    }

    // 验证密码
    const isMatch = await bcrypt.compare(validatedData.password, user.password)
    if (!isMatch) {
      throw new Unauthorized('密码错误')
    }

    // 生成 JWT token
    const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.SECRET,
      {
        expiresIn: '7d',
      },
    )
    // 返回token和用户信息（不包含密码）
    const userInfo = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
    }
    return { token, user: userInfo }
  }

  /**
   * 根据ID获取用户详情
   * @param {number} userId - 用户ID
   * @returns {Promise<Object>} 用户详情
   */
  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        // 不返回密码字段
      },
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    return { user }
  }

  /**
   * 根据手机号获取用户（用于登录）
   * @param {string} phone - 手机号
   * @returns {Promise<Object|null>} 用户信息（包含密码）
   */
  async getUserByPhone(phone) {
    const user = await prisma.user.findUnique({
      where: { phone },
      // 这里返回密码，用于登录验证
    })

    if (!user) {
      return null
    }

    return user
  }

  /**
   * 更新用户信息
   * @param {number} userId - 用户ID
   * @param {Object} updateData - 要更新的数据
   * @returns {Promise<Object>} 更新后的用户
   */
  async updateUser(userId, updateData) {
    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existingUser) {
      throw new Error('用户不存在')
    }

    // 不允许修改的字段
    const disallowedFields = ['id']

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

    // 如果更新了密码，进行加密
    if (filteredUpdateData.password) {
      filteredUpdateData.password = await bcrypt.hash(filteredUpdateData.password, 10)
    }

    // 执行更新
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: filteredUpdateData,
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        // 不返回密码字段
      },
    })

    return {
      user: updatedUser,
      message: '用户信息更新成功',
    }
  }

  /**
   * 删除用户
   * @param {number} userId - 用户ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteUser(userId) {
    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existingUser) {
      throw new Error('用户不存在')
    }

    // 检查用户是否有相关的助手、消息或设置记录
    // 根据业务需求决定是否允许删除，这里我们选择级联删除
    await prisma.$transaction(async (prisma) => {
      // 删除用户相关的助手
      await prisma.assistant.deleteMany({
        where: { userId },
      })

      // 删除用户相关的设置
      await prisma.setting.deleteMany({
        where: { userId },
      })

      // 注意：Message表没有直接的userId字段，需要根据业务逻辑处理
      // 这里假设Message通过assistantId关联，所以不需要单独处理

      // 最后删除用户
      await prisma.user.delete({
        where: { id: userId },
      })
    })

    return {
      message: '用户删除成功',
      userId,
    }
  }

  /**
   * 批量获取用户信息
   * @param {Array<number>} userIds - 用户ID数组
   * @returns {Promise<Array>} 用户列表
   */
  async getUsersByIds(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return []
    }

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        // 不返回密码字段
      },
      orderBy: { id: 'desc' },
    })

    return users
  }

  /**
   * 验证用户密码
   * @param {string} plainPassword - 明文密码
   * @param {string} hashedPassword - 哈希密码
   * @returns {Promise<boolean>} 密码是否正确
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword)
  }
}

export default new UserService()
