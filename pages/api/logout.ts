import type { NextApiRequest, NextApiResponse } from 'next'

const COOKIE_NAME = process.env.NEXT_PUBLIC_COOKIE_NAME || 'token'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`)
  res.status(200).json({ success: true, message: 'Logout successful' })
} 