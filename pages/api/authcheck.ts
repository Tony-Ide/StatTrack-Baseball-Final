import type { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { extractCookie } from '@/lib/utils'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}
const COOKIE_NAME = process.env.NEXT_PUBLIC_COOKIE_NAME || 'token'

function getToken(req: NextApiRequest): string | null {
  const cookie = req.headers.cookie || ''
  
  // Use precise cookie extraction to avoid conflicts with similar cookie names
  const token = extractCookie(cookie, COOKIE_NAME)
  
  if (token) {
    // Log token info for debugging (without exposing the full token)
    console.log(`[AUTH] Token extracted successfully. Length: ${token.length}, Preview: ${token.substring(0, 20)}...`)
    return token
  }
  
  // Fallback to Authorization header
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    const bearerToken = auth.slice(7)
    console.log(`[AUTH] Bearer token extracted. Length: ${bearerToken.length}, Preview: ${bearerToken.substring(0, 20)}...`)
    return bearerToken
  }
  
  console.log(`[AUTH] No token found in cookies or Authorization header`)
  return null
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: true, message: 'Method not allowed' })
  }
  try {
    const token = getToken(req)
    if (!token) {
      return res.status(401).json({ error: true, message: 'Please login to access this resource.' })
    }
    
    try {
    const payload = jwt.verify(token, JWT_SECRET!)
      console.log(`[AUTH] Token verified successfully for user: ${(payload as any).user_id}`)
    res.status(200).json({ success: true, user: payload })
    } catch (jwtError) {
      console.error(`[AUTH] JWT verification failed:`, jwtError)
      res.status(401).json({ error: true, message: 'Invalid or expired token.' })
    }
  } catch (err) {
    console.error(`[AUTH] Unexpected error:`, err)
    res.status(500).json({ error: true, message: 'Internal server error.' })
  }
} 