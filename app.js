import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import logger from 'morgan'
import 'dotenv/config'
import createError from 'http-errors'
import errorHandler from './middlewares/error-handler.js'
import routes from './config/routes.js'

const originalJSONStringify = JSON.stringify
JSON.stringify = function (value, replacer, space) {
  const customReplacer = function (key, val) {
    if (typeof val === 'bigint') {
      return val.toString() // 将 BigInt 转为字符串
    }
    return replacer ? replacer.call(this, key, val) : val
  }
  return originalJSONStringify(value, customReplacer, space)
}

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 模板引擎
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(
  cors({
    origin: 'http://localhost:3000', // 替换为你的前端地址
    credentials: true, // 允许发送 cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(express.static(path.join(__dirname, 'public')))

// 路由
app.use(routes)

// 404 错误
app.use((req, res, next) => {
  next(createError(404))
})

// 错误中间件
app.use(errorHandler)

export default app
