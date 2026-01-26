import express from 'express'

// 前台路由文件
import userRouter from '../routes/users.js'
import assistantRouter from '../routes/assistants.js'
import messageRouter from '../routes/messages.js'
import noteRouter from '../routes/notes.js'
import noteMessageRouter from '../routes/noteMessages.js'
import providerRouter from '../routes/providers.js'
import settingRouter from '../routes/settings.js'
import uploadRouter from '../routes/upload.js'

const router = express.Router()

// 前台路由配置
router.use('/users', userRouter)
router.use('/assistants', assistantRouter)
router.use('/messages', messageRouter)
router.use('/notes', noteRouter)
router.use('/note_messages', noteMessageRouter)
router.use('/providers', providerRouter)
router.use('/settings', settingRouter)
router.use('/upload', uploadRouter)

export default router
