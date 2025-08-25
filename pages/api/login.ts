import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { encodeCookieValue } from '@/lib/utils'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}
const COOKIE_NAME = process.env.NEXT_PUBLIC_COOKIE_NAME || 'token'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed' })
  }
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: true, message: 'Email and password are required.' })
  }
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, email, password_hash, team_id, email_verified')
      .eq('email', email)
      .single()
    if (error || !user) {
      return res.status(401).json({ error: true, message: 'Invalid email or password.' })
    }
    
    // Check if user still exists (in case they were deleted)
    if (!user.user_id) {
      return res.status(401).json({ error: true, message: 'Account not found. Please register again.' })
    }
    
    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({ 
        error: true, 
        message: 'Please verify your email address before logging in. Check your inbox for a verification link.' 
      })
    }
    
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      return res.status(401).json({ error: true, message: 'Invalid email or password.' })
    }
    const { password_hash, ...userData } = user
    const token = jwt.sign(userData, JWT_SECRET!, { expiresIn: '2h' })
    
    // URL encode the token to handle special characters safely
    const encodedToken = encodeCookieValue(token)
    
    // Set the cookie with the encoded token
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodedToken}; HttpOnly; Path=/; Max-Age=7200; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`)
    
    console.log(`[LOGIN] User ${userData.user_id} logged in successfully. Token length: ${token.length}`)
    return res.status(200).json({ success: true, user: userData })
  } catch (err) {
    console.error(`[LOGIN] Error during login:`, err)
    return res.status(500).json({ error: true, message: 'Internal server error' })
  }
} 