import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { randomBytes, createHash } from 'crypto'

const TTL_MIN = 10

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed' })
  }

  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: true, message: 'Email is required' })
    }

    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('user_id, email')
      .eq('email', email)
      .single()

    if (findError || !user) {
      // Don't reveal if user exists or not (security)
      return res.status(200).json({ 
        success: true, 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      })
    }

    // Generate secure reset token
    const raw = randomBytes(32).toString('base64url')
    const hash = createHash('sha256').update(raw).digest('hex')
    const expiresAt = new Date(Date.now() + TTL_MIN * 60 * 1000)

    // Update user with reset token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token: hash,
        reset_expires: expiresAt.toISOString()
      })
      .eq('user_id', user.user_id)

    if (updateError) {
      console.error('Error updating reset token:', updateError)
      return res.status(500).json({ error: true, message: 'Failed to generate reset token' })
    }

    // Create reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/reset-password?token=${raw}`

    // TODO: Replace with your actual email service
    // For now, we'll log the reset URL
    console.log(`[FORGOT PASSWORD] Reset URL for ${email}: ${resetUrl}`)
    console.log(`[FORGOT PASSWORD] Token expires at: ${expiresAt.toISOString()}`)

    // In production, you would send an actual email here
    // await sendEmail({
    //   to: email,
    //   subject: 'Reset your password - StatTrack Baseball',
    //   html: `
    //     <h2>Password Reset Request</h2>
    //     <p>You requested to reset your password. Click the link below to set a new password:</p>
    //     <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a>
    //     <p>This link expires in ${TTL_MIN} minutes.</p>
    //     <p>If you didn't request a password reset, you can safely ignore this email.</p>
    //   `,
    //   text: `Reset your password: ${resetUrl} (expires in ${TTL_MIN} minutes)`
    // })

    return res.status(200).json({ 
      success: true, 
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Remove this in production - only for development
      debugUrl: resetUrl
    })

  } catch (err) {
    console.error('Error in forgot-password:', err)
    return res.status(500).json({ error: true, message: 'Internal server error' })
  }
}
