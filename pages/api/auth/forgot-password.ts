import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { randomBytes, createHash } from 'crypto'
import { sendEmail } from '@/lib/email'

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

    // Send password reset email
    try {
      await sendEmail({
        to: email,
        subject: 'Reset your password - StatTrack Baseball',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">StatTrack Baseball</h1>
            </div>
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
              <h2 style="color: #374151; margin-top: 0;">Password Reset Request</h2>
              <p style="color: #6b7280; line-height: 1.6;">We received a request to reset your password for your StatTrack Baseball account. Click the button below to set a new password:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset Password</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                <strong>Important:</strong> This password reset link expires in ${TTL_MIN} minutes for security reasons.
              </p>
              
              <p style="color: #6b7280; font-size: 14px;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #f97316;">${resetUrl}</a>
              </p>
            </div>
          </div>
        `,
        text: `Password Reset Request - StatTrack Baseball

We received a request to reset your password for your StatTrack Baseball account.

Click the link below to set a new password:

${resetUrl}

This link expires in ${TTL_MIN} minutes.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
The StatTrack Baseball Team`
      })

      console.log(`[FORGOT PASSWORD] Password reset email sent to ${email}`)
      
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError)
      return res.status(500).json({ error: true, message: 'Failed to send password reset email' })
    }

    return res.status(200).json({ 
      success: true, 
      message: 'If an account with that email exists, a password reset link has been sent.'
    })

  } catch (err) {
    console.error('Error in forgot-password:', err)
    return res.status(500).json({ error: true, message: 'Internal server error' })
  }
}
