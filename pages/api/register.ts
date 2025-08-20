import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { email, password, team_id } = req.body
  if (!email || !password || !team_id) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
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
  // Insert user
  const { error } = await supabase.from('users').insert([{ email, password_hash, team_id }])
  if (error) {
    return res.status(500).json({ error: error.message })
  }
  return res.status(201).json({ success: true })
} 