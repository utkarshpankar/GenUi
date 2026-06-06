import express from 'express'
import { generateHandler } from '../controllers/generateController.js'

const router = express.Router()

router.post('/generate', generateHandler)

export default router

