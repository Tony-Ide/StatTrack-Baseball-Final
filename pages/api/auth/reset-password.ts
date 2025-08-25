import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { createHash, timingSafeEqual } from 'crypto'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed' })
  }

  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword) {
      return res.status(400).json({ error: true, message: 'Token and new password are required' })
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: true, message: 'Password must be at least 8 characters long' })
    }

    // Hash the provided token
    const tryHash = createHash('sha256').update(token).digest('hex')

    // Find user by reset token
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('user_id, email, reset_token, reset_expires')
      .eq('reset_token', tryHash)
      .single()

    if (findError || !user || !user.reset_token) {
      return res.status(400).json({ error: true, message: 'Invalid or expired reset link' })
    }

    // Check if token has expired
    if (user.reset_expires && new Date(user.reset_expires) < new Date()) {
      return res.status(400).json({ error: true, message: 'Reset link has expired' })
    }

    // Constant-time comparison for security
    const ok = 
      user.reset_token.length === tryHash.length &&
      timingSafeEqual(Buffer.from(user.reset_token), Buffer.from(tryHash))

    if (!ok) {
      return res.status(400).json({ error: true, message: 'Invalid reset token' })
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update password and clear reset token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        reset_token: null,
        reset_expires: null
      })
      .eq('user_id', user.user_id)

    if (updateError) {
      console.error('Error updating password:', updateError)
      return res.status(500).json({ error: true, message: 'Failed to reset password' })
    }

    console.log(`[PASSWORD RESET] Password reset successfully for user ${user.user_id} (${user.email})`)

    return res.status(200).json({ 
      success: true, 
      message: 'Password reset successfully. You can now log in with your new password.' 
    })

  } catch (err) {
    console.error('Error in reset-password:', err)
    return res.status(500).json({ error: true, message: 'Internal server error' })
  }
}
