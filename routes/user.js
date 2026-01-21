import express from 'express'
import { success } from '../utils/responses.js'
import userService from '../services/user-service.js'

const router = express.Router()

/**
 * 用户登录
 * POST /auth/login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { login, password } = req.body

    // 调用服务层的登录方法
    const data = await userService.signInUser({ login, password })
    success(res, '登录成功', data)
  } catch (error) {
    // 处理特定错误
    if (
      error.name === 'Unauthorized' ||
      error.message.includes('用户不存在') ||
      error.message.includes('密码错误')
    ) {
      return res.status(401).json({
        success: false,
        message: error.message,
        data: null,
      })
    }
    // 处理其他验证错误
    if (error.message.includes('不能为空') || error.message.includes('格式不正确')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: null,
      })
    }
    next(error)
  }
})

/**
 * 获取当前用户信息（通过token）
 * GET /auth/me
 */
router.get('/me', async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证token',
        data: null,
      })
    }

    const token = authHeader.split(' ')[1]

    // 根据token获取用户信息
    const user = await userService.getUserFromToken(token)

    success(res, '获取用户信息成功', { user })
  } catch (error) {
    if (error.name === 'Unauthorized') {
      return res.status(401).json({
        success: false,
        message: error.message,
        data: null,
      })
    }
    next(error)
  }
})

/**
 * 用户注册
 * POST /auth/register
 */
router.post('/register', async (req, res, next) => {
  try {
    const userData = req.body

    // 验证必要字段
    const requiredFields = ['phone', 'email', 'name', 'password']
    for (const field of requiredFields) {
      if (!userData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field}字段不能为空`,
          data: null,
        })
      }
    }

    // 创建用户
    const user = await userService.createUser(userData)

    // 注册成功后自动登录
    const loginData = await userService.signInUser({
      login: userData.email, // 可以使用邮箱、用户名或手机号登录
      password: userData.password,
    })

    success(res, '注册成功', loginData)
  } catch (error) {
    if (error.code === 'P2002') {
      const target = error.meta?.target
      let message = '注册失败，数据冲突'
      if (target && target.includes('phone')) {
        message = '手机号已存在'
      } else if (target && target.includes('email')) {
        message = '邮箱已存在'
      } else if (target && target.includes('name')) {
        message = '用户名已存在'
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
 * 查询用户列表
 * GET /users
 * 支持分页和搜索查询参数
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, phone, email, name } = req.query

    // 构建查询条件
    const where = {}

    if (phone) {
      where.phone = { contains: phone }
    }

    if (email) {
      where.email = { contains: email }
    }

    if (name) {
      where.name = { contains: name }
    }

    // 将分页参数转换为数字
    const pageNumber = Math.max(1, Number(page))
    const limitNumber = Math.min(100, Math.max(1, Number(limit)))
    const skip = (pageNumber - 1) * limitNumber

    // 获取用户列表
    const data = await userService.getUserList({
      where,
      skip,
      take: limitNumber,
      orderBy: { id: 'desc' },
    })

    success(res, '查询用户列表成功', data)
  } catch (error) {
    next(error)
  }
})

/**
 * 根据ID获取用户详情
 * GET /users/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // 验证ID参数
    const userId = Number(id)
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式不正确',
        data: null,
      })
    }

    // 获取用户详情
    const data = await userService.getUserById(userId)
    success(res, '获取用户详情成功', data)
  } catch (error) {
    if (error.message === '用户不存在') {
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
 * 更新用户信息
 * PUT /users/:id
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // 验证ID参数
    const userId = Number(id)
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式不正确',
        data: null,
      })
    }

    // 验证更新数据
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '更新数据不能为空',
        data: null,
      })
    }

    // 验证字段格式
    if (updateData.phone && !/^\d{11}$/.test(updateData.phone)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确（必须为11位数字）',
        data: null,
      })
    }

    if (updateData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确',
        data: null,
      })
    }

    // 执行更新
    const data = await userService.updateUser(userId, updateData)
    success(res, data.message || '更新用户成功', data)
  } catch (error) {
    // 处理特定错误
    if (error.message === '用户不存在') {
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
      let message = '更新失败，数据冲突'
      if (target && target.includes('phone')) {
        message = '手机号已存在'
      } else if (target && target.includes('email')) {
        message = '邮箱已存在'
      } else if (target && target.includes('name')) {
        message = '用户名已存在'
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
 * 删除用户
 * DELETE /users/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // 验证ID参数
    const userId = Number(id)
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式不正确',
        data: null,
      })
    }

    // 执行删除
    const data = await userService.deleteUser(userId)
    success(res, data.message || '删除用户成功', data)
  } catch (error) {
    if (error.message === '用户不存在') {
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
 * 批量查询用户信息
 * POST /users/batch
 */
router.post('/batch', async (req, res, next) => {
  try {
    const { userIds } = req.body

    // 验证必要参数
    if (!userIds) {
      return res.status(400).json({
        success: false,
        message: 'userIds不能为空',
        data: null,
      })
    }

    // 验证userIds格式
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds必须是非空数组',
        data: null,
      })
    }

    // 验证数组中的每个元素是否为数字
    const invalidUserIds = userIds.filter((id) => isNaN(Number(id)) || Number(id) <= 0)

    if (invalidUserIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `存在无效的用户ID: ${invalidUserIds.join(', ')}`,
        data: null,
      })
    }

    // 转换为数字数组
    const numericUserIds = userIds.map((id) => Number(id))

    // 批量获取用户信息
    const users = await userService.getUsersByIds(numericUserIds)

    success(res, '批量获取用户成功', { users })
  } catch (error) {
    next(error)
  }
})

export default router
