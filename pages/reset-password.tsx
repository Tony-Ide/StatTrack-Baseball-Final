import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, XCircle, Loader2, Lock } from 'lucide-react'
import Layout from '@/components/Layout'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { token } = router.query
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (token && typeof token === 'string') {
      validateToken(token)
    }
  }, [token])

  const validateToken = async (token: string) => {
    try {
      // We'll validate the token by trying to reset with a dummy password
      // This is just to check if the token is valid
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword: 'dummy' }),
      })

      if (response.status === 400) {
        const data = await response.json()
        if (data.message.includes('Password must be at least 8 characters')) {
          // Token is valid, just password too short
          setStatus('valid')
          setMessage('Enter your new password below.')
        } else {
          // Token is invalid
          setStatus('invalid')
          setMessage(data.message || 'Invalid or expired reset link.')
        }
      } else {
        setStatus('invalid')
        setMessage('Invalid or expired reset link.')
      }
    } catch (error) {
      setStatus('invalid')
      setMessage('An error occurred while validating the reset link.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || typeof token !== 'string') return

    // Validate passwords
    if (newPassword.length < 8) {
      setMessage('Password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message)
      } else {
        setStatus('error')
        setMessage(data.message || 'Failed to reset password.')
      }
    } catch (error) {
      setStatus('error')
      setMessage('An error occurred while resetting your password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      case 'valid':
        return <Lock className="h-12 w-12 text-orange-500" />
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />
      case 'invalid':
      case 'error':
        return <XCircle className="h-12 w-12 text-red-500" />
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return 'Validating reset link...'
      case 'valid':
        return 'Reset Your Password'
      case 'success':
        return 'Password Reset Successfully!'
      case 'invalid':
        return 'Invalid Reset Link'
      case 'error':
        return 'Reset Failed'
    }
  }

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {getStatusTitle()}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'valid' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be at least 8 characters long
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            )}
            
            {status === 'success' && (
              <Button 
                onClick={() => router.push('/login')}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                Go to Login
              </Button>
            )}
            
            {(status === 'invalid' || status === 'error') && (
              <div className="space-y-3">
                <Button 
                  onClick={() => router.push('/forgot-password')}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  Request New Reset Link
                </Button>
                <Button 
                  onClick={() => router.push('/login')}
                  variant="outline"
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
