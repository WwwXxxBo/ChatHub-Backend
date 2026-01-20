import express from 'express'

// 前台路由文件
import authRouter from '../routes/auth.js'
import assistantRouter from '../routes/assistants.js'
import messageRouter from '../routes/messags.js'
const router = express.Router()

// 前台路由配置

router.use('/auth', authRouter)
router.use('/assistants', assistantRouter)
router.use('/messages', messageRouter)

export default router
