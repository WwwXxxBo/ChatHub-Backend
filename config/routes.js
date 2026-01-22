import express from 'express'

// 前台路由文件
import userRouter from '../routes/user.js'
import assistantRouter from '../routes/assistants.js'
import messageRouter from '../routes/messags.js'
import noteRouter from '../routes/notes.js'
import noteMessageRouter from '../routes/noteMessages.js'

const router = express.Router()

// 前台路由配置
router.use('/users', userRouter)
router.use('/assistants', assistantRouter)
router.use('/messages', messageRouter)
router.use('/notes', noteRouter)
router.use('/noteMessages', noteMessageRouter)

export default router
