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

    // TODO: Replace with your actual email service
    // For now, we'll log the verification URL
    console.log(`[EMAIL VERIFICATION] Verification URL for ${email}: ${verifyUrl}`)
    console.log(`[EMAIL VERIFICATION] Token expires at: ${expiresAt.toISOString()}`)

    // In production, you would send an actual email here
    // await sendEmail({
    //   to: email,
    //   subject: 'Verify your email - StatTrack Baseball',
    //   html: `
    //     <h2>Welcome to StatTrack Baseball!</h2>
    //     <p>Please click the link below to verify your email address:</p>
    //     <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px;">Verify Email</a>
    //     <p>This link expires in ${TTL_MIN} minutes.</p>
    //     <p>If you didn't create an account, you can safely ignore this email.</p>
    //   `,
    //   text: `Verify your email: ${verifyUrl} (expires in ${TTL_MIN} minutes)`
    // })

    return res.status(200).json({ 
      success: true, 
      message: 'Verification email sent',
      // Remove this in production - only for development
      debugUrl: verifyUrl
    })

  } catch (err) {
    console.error('Error in start-verify:', err)
    return res.status(500).json({ error: true, message: 'Internal server error' })
  }
}
