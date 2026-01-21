import express from 'express'

// 前台路由文件
import assistantRouter from '../routes/assistants.js'
import messageRouter from '../routes/messags.js'
import userRouter from '../routes/user.js'
const router = express.Router()

// 前台路由配置
router.use('/users', userRouter)
router.use('/assistants', assistantRouter)
router.use('/messages', messageRouter)

export default router
