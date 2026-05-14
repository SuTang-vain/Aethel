import { Router, type Request, type Response } from 'express'
import dotenv from 'dotenv'

dotenv.config()

const router = Router()

const MEMORY_BASE_URL = 'https://api-inference.modelscope.cn/v1'

router.post('/add', async (req: Request, res: Response) => {
  try {
    const { content, userId, metadata = {} } = req.body

    if (!content || !userId) {
      res.status(400).json({ success: false, error: 'content and userId are required' })
      return
    }

    const response = await fetch(`${MEMORY_BASE_URL}/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MODELSCOPE_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content }],
        user_id: userId,
        metadata,
      }),
    })

    const data = await response.json()
    res.json({ success: true, ...data })
  } catch (error: unknown) {
    console.error('Memory add error:', error)
    res.status(500).json({ success: false, error: (error as Error).message || 'Memory add error' })
  }
})

router.get('/search', async (req: Request, res: Response) => {
  try {
    const { query, userId, limit = '10' } = req.query

    if (!query || !userId) {
      res.status(400).json({ success: false, error: 'query and userId are required' })
      return
    }

    const response = await fetch(
      `${MEMORY_BASE_URL}/memories/search?query=${encodeURIComponent(query as string)}&user_id=${encodeURIComponent(userId as string)}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MODELSCOPE_API_KEY}`,
        },
      }
    )

    const data = await response.json()
    res.json({ success: true, ...data })
  } catch (error: unknown) {
    console.error('Memory search error:', error)
    res.status(500).json({ success: false, error: (error as Error).message || 'Memory search error' })
  }
})

router.get('/list', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query

    if (!userId) {
      res.status(400).json({ success: false, error: 'userId is required' })
      return
    }

    const response = await fetch(
      `${MEMORY_BASE_URL}/memories?user_id=${encodeURIComponent(userId as string)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MODELSCOPE_API_KEY}`,
        },
      }
    )

    const data = await response.json()
    res.json({ success: true, ...data })
  } catch (error: unknown) {
    console.error('Memory list error:', error)
    res.status(500).json({ success: false, error: (error as Error).message || 'Memory list error' })
  }
})

export default router
