import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { createHash, timingSafeEqual } from 'crypto'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed' })
  }

  try {
    const { token } = req.body
    if (!token) {
      return res.status(400).json({ error: true, message: 'Token is required' })
    }

    // Hash the provided token
    const tryHash = createHash('sha256').update(token).digest('hex')

    // Find user by token hash
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('user_id, email, verification_token, verification_expires')
      .eq('verification_token', tryHash)
      .eq('email_verified', false)
      .single()

    if (findError || !user || !user.verification_token) {
      return res.status(400).json({ error: true, message: 'Invalid or expired verification link' })
    }

    // Check if token has expired
    if (user.verification_expires && new Date(user.verification_expires) < new Date()) {
      return res.status(400).json({ error: true, message: 'Verification link has expired' })
    }

    // Constant-time comparison for security
    const ok = 
      user.verification_token.length === tryHash.length &&
      timingSafeEqual(Buffer.from(user.verification_token), Buffer.from(tryHash))

    if (!ok) {
      return res.status(400).json({ error: true, message: 'Invalid verification token' })
    }

    // Mark email as verified and clear token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        verification_token: null,
        verification_expires: null
      })
      .eq('user_id', user.user_id)

    if (updateError) {
      console.error('Error updating user verification status:', updateError)
      return res.status(500).json({ error: true, message: 'Failed to verify email' })
    }

    console.log(`[EMAIL VERIFICATION] Email verified successfully for user ${user.user_id} (${user.email})`)

    return res.status(200).json({ 
      success: true, 
      message: 'Email verified successfully' 
    })

  } catch (err) {
    console.error('Error in verify-token:', err)
    return res.status(500).json({ error: true, message: 'Internal server error' })
  }
}
