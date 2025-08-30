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
      return res.status(404).json({ error: true, message: 'User not found' })
    }

    // Generate secure token
    const raw = randomBytes(32).toString('base64url')
    const hash = createHash('sha256').update(raw).digest('hex')
    const expiresAt = new Date(Date.now() + TTL_MIN * 60 * 1000)

    // Update user with verification token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: false,
        verification_token: hash,
        verification_expires: expiresAt.toISOString()
      })
      .eq('user_id', user.user_id)

    if (updateError) {
      console.error('Error updating verification token:', updateError)
      return res.status(500).json({ error: true, message: 'Failed to generate verification token' })
    }

    // Create verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const verifyUrl = `${baseUrl}/verify?token=${raw}`

    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: 'Verify your email - StatTrack Baseball',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">StatTrack Baseball</h1>
            </div>
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
              <h2 style="color: #374151; margin-top: 0;">Welcome to StatTrack Baseball!</h2>
              <p style="color: #6b7280; line-height: 1.6;">Please click the button below to verify your email address and complete your registration:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="display: inline-block; padding: 14px 28px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Verify Email Address</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                <strong>Important:</strong> This verification link expires in ${TTL_MIN} minutes for security reasons.
              </p>
              
              <p style="color: #6b7280; font-size: 14px;">
                If you didn't create an account with StatTrack Baseball, you can safely ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${verifyUrl}" style="color: #f97316;">${verifyUrl}</a>
              </p>
            </div>
          </div>
        `,
        text: `Welcome to StatTrack Baseball!

Please verify your email address by clicking the link below:

${verifyUrl}

This link expires in ${TTL_MIN} minutes.

If you didn't create an account with StatTrack Baseball, you can safely ignore this email.

Best regards,
The StatTrack Baseball Team`
      })

      console.log(`[EMAIL VERIFICATION] Verification email sent to ${email}`)
      
    } catch (emailError) {
      console.error('Error sending verification email:', emailError)
      return res.status(500).json({ error: true, message: 'Failed to send verification email' })
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Verification email sent successfully'
    })

  } catch (err) {
    console.error('Error in start-verify:', err)
    return res.status(500).json({ error: true, message: 'Internal server error' })
  }
}
