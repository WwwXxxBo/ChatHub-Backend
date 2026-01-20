import { z } from 'zod'
import createError from 'http-errors'

const { BadRequest } = createError

// 用户注册验证规则
export const signUpSchema = z.object({
  name: z
    .string({
      required_error: '用户名不能为空。',
    })
    .min(4, '用户名至少需要4个字符。')
    .max(20, '用户名不能超过20个字符。')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线。'),
  phone: z
    .string({
      required_error: '手机号不能为空。',
    })
    .regex(/^1[3-9]\d{9}$/, '请输入有效的中国大陆手机号。'),
  email: z
    .string({
      required_error: '邮箱不能为空。',
    })
    .email('请输入有效的邮箱地址。'),
  password: z
    .string({
      required_error: '密码不能为空。',
    })
    .min(6, '密码至少需要6个字符。')
    .max(20, '密码不能超过20个字符。'),
})

// 用户登录验证规则
export const signInSchema = z.object({
  login: z
    .string({
      required_error: '邮箱/用户名必须填写。',
    })
    .min(1, '请输入用户名。'),
  password: z
    .string({
      required_error: '密码必须填写。',
    })
    .min(1, '请输入密码。'),
})

// 用户注册验证函数
export const validateSignUp = (data) => {
  console.log('data:', data)
  if (!data) throw new BadRequest('您没有提交数据。')
  return signUpSchema.parse(data)
}

// 用户登录验证函数
export const validateSignIn = (data) => {
  if (!data) throw new BadRequest('您没有提交数据。')
  return signInSchema.parse(data)
}
