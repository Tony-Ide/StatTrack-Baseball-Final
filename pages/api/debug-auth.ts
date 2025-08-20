import type { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { extractCookie, encodeCookieValue } from '@/lib/utils'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}
const COOKIE_NAME = process.env.NEXT_PUBLIC_COOKIE_NAME || 'token'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action } = req.query

  switch (action) {
    case 'clear-cookies':
      // Clear all authentication-related cookies
      res.setHeader('Set-Cookie', [
        `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`,
        'refresh_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict',
        'sessionid=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict',
        'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
      ])
      return res.status(200).json({ 
        success: true, 
        message: 'All authentication cookies cleared. Please refresh the page.' 
      })

    case 'test-jwt':
      // Test JWT generation and verification
      try {
        const testUser = { user_id: 'test-user', email: 'test@example.com', team_id: 'test-team' }
            const testToken = jwt.sign(testUser, JWT_SECRET!, { expiresIn: '1h' })
    const decoded = jwt.verify(testToken, JWT_SECRET!)
        
        return res.status(200).json({
          success: true,
          message: 'JWT generation and verification working correctly',
          testToken: testToken.substring(0, 50) + '...',
          decoded
        })
      } catch (error) {
        return res.status(500).json({
          error: 'JWT test failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }

    case 'check-cookies':
      // Check what cookies are present
      const cookie = req.headers.cookie || ''
      const cookies = cookie.split(';').map(c => c.trim()).filter(c => c)
      
      const cookieInfo = cookies.map(cookie => {
        const [name, value] = cookie.split('=', 2)
        return {
          name: name || 'unknown',
          value: value ? `${value.substring(0, 20)}...` : 'no value',
          fullLength: value ? value.length : 0
        }
      })

      return res.status(200).json({
        success: true,
        message: 'Cookie analysis complete',
        totalCookies: cookies.length,
        cookies: cookieInfo,
        rawCookieString: cookie.substring(0, 200) + (cookie.length > 200 ? '...' : '')
      })

    case 'extract-token':
      // Test token extraction
      const token = extractCookie(req.headers.cookie || '', COOKIE_NAME)
      
      if (token) {
        try {
          const payload = jwt.verify(token, JWT_SECRET!)
          return res.status(200).json({
            success: true,
            message: 'Token extracted and verified successfully',
            tokenLength: token.length,
            tokenPreview: token.substring(0, 50) + '...',
            payload
          })
        } catch (error) {
          return res.status(200).json({
            success: false,
            message: 'Token extracted but verification failed',
            tokenLength: token.length,
            tokenPreview: token.substring(0, 50) + '...',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      } else {
        return res.status(200).json({
          success: false,
          message: 'No token found in cookies',
          cookieString: req.headers.cookie || 'no cookies'
        })
      }

    default:
      return res.status(400).json({
        error: 'Invalid action',
        message: 'Available actions: clear-cookies, test-jwt, check-cookies, extract-token',
        usage: {
          'clear-cookies': 'Clears all authentication cookies',
          'test-jwt': 'Tests JWT generation and verification',
          'check-cookies': 'Analyzes all cookies present',
          'extract-token': 'Tests token extraction and verification'
        }
      })
  }
} 