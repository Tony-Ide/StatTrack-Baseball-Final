import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'crypto'

const TTL_MIN = 10

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { email, password, team_id } = req.body
  if (!email || !password || !team_id) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Validate .edu email domain
  const emailDomain = email.split('@')[1]?.toLowerCase()
  if (!emailDomain || !emailDomain.endsWith('.edu')) {
    return res.status(400).json({ error: 'Only .edu email addresses are allowed' })
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
    
    // TODO: Replace with your actual email service
    // For now, we'll log the verification URL
    console.log(`[REGISTRATION] New user registered: ${email}`)
    console.log(`[REGISTRATION] Verification URL: ${verifyUrl}`)
    console.log(`[REGISTRATION] Token expires at: ${expiresAt.toISOString()}`)
    
    // In production, you would send an actual email here
    // await sendEmail({
    //   to: email,
    //   subject: 'Welcome to StatTrack Baseball - Verify your email',
    //   html: `
    //     <h2>Welcome to StatTrack Baseball!</h2>
    //     <p>Thank you for registering. Please click the link below to verify your email address:</p>
    //     <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px;">Verify Email</a>
    //     <p>This link expires in ${TTL_MIN} minutes.</p>
    //     <p>If you didn't create an account, you can safely ignore this email.</p>
    //   `,
    //   text: `Welcome to StatTrack Baseball! Verify your email: ${verifyUrl} (expires in ${TTL_MIN} minutes)`
    // })
    
    return res.status(201).json({ 
      success: true, 
      message: 'Registration successful. Please check your email to verify your account.',
      // Remove this in production - only for development
      debugUrl: verifyUrl
    })
    
  } catch (err) {
    console.error('Error in registration:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 