import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'crypto'
import { sendEmail } from '@/lib/email'

const TTL_MIN = 10

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { email, password, team_id } = req.body
  if (!email || !password || !team_id) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' })
  }

  // Only allow .edu email addresses
  const emailDomain = email.split('@')[1]?.toLowerCase()
  if (!emailDomain || !emailDomain.endsWith('.edu')) {
    return res.status(400).json({ error: 'Only .edu email addresses are allowed for registration' })
  }
  
  try {
    // Check if user exists
    const { data: existing, error: findError } = await supabase.from('users').select('user_id').eq('email', email).single()
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }
    if (findError && findError.code !== 'PGRST116') {
      return res.status(500).json({ error: findError.message })
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 10)
    
    // Generate verification token
    const raw = randomBytes(32).toString('base64url')
    const hash = createHash('sha256').update(raw).digest('hex')
    const expiresAt = new Date(Date.now() + TTL_MIN * 60 * 1000)
    
    // Insert user with verification token
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{ 
        email, 
        password_hash, 
        team_id,
        email_verified: false,
        verification_token: hash,
        verification_expires: expiresAt.toISOString()
      }])
      .select('user_id')
      .single()
    
    if (insertError) {
      return res.status(500).json({ error: insertError.message })
    }
    
    // Create verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const verifyUrl = `${baseUrl}/verify?token=${raw}`
    
    // Send welcome email with verification link
    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to StatTrack Baseball - Verify your email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">StatTrack Baseball</h1>
            </div>
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
              <h2 style="color: #374151; margin-top: 0;">Welcome to StatTrack Baseball!</h2>
              <p style="color: #6b7280; line-height: 1.6;">Thank you for registering! We're excited to have you join our baseball analytics platform. To complete your registration, please verify your email address by clicking the button below:</p>
              
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

Thank you for registering! We're excited to have you join our baseball analytics platform.

To complete your registration, please verify your email address by clicking the link below:

${verifyUrl}

This link expires in ${TTL_MIN} minutes.

If you didn't create an account with StatTrack Baseball, you can safely ignore this email.

Best regards,
The StatTrack Baseball Team`
      })

      console.log(`[REGISTRATION] Welcome email sent to ${email}`)
      
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError)
      return res.status(500).json({ error: 'Registration successful but failed to send verification email. Please contact support.' })
    }
    
    return res.status(201).json({ 
      success: true, 
      message: 'Registration successful. Please check your email to verify your account.'
    })
    
  } catch (err) {
    console.error('Error in registration:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 