import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface DebugResult {
  success: boolean
  message: string
  [key: string]: any
}

export default function DebugAuth() {
  const [results, setResults] = useState<Record<string, DebugResult>>({})
  const [loading, setLoading] = useState<string | null>(null)

  const runDebugAction = async (action: string) => {
    setLoading(action)
    try {
      const response = await fetch(`/api/debug-auth?action=${action}`)
      const result = await response.json()
      setResults(prev => ({ ...prev, [action]: result }))
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        [action]: { 
          success: false, 
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        } 
      }))
    } finally {
      setLoading(null)
    }
  }

  const actions = [
    { key: 'check-cookies', label: 'Check Cookies', description: 'Analyze all cookies present' },
    { key: 'extract-token', label: 'Extract Token', description: 'Test token extraction and verification' },
    { key: 'test-jwt', label: 'Test JWT', description: 'Test JWT generation and verification' },
    { key: 'clear-cookies', label: 'Clear Cookies', description: 'Clear all authentication cookies' }
  ]

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Authentication Debug Tool</h1>
        <p className="text-muted-foreground">
          Use this tool to diagnose and fix authentication issues. The cookie parsing conflict 
          has been fixed, but you can use these tools to verify everything is working correctly.
        </p>
      </div>

      <div className="grid gap-6 mb-8">
        {actions.map(({ key, label, description }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {label}
                {loading === key && <Badge variant="secondary">Loading...</Badge>}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => runDebugAction(key)}
                disabled={loading !== null}
                variant={key === 'clear-cookies' ? 'destructive' : 'default'}
              >
                {loading === key ? 'Running...' : `Run ${label}`}
              </Button>
              
              {results[key] && (
                <Alert className={`mt-4 ${results[key].success ? 'border-green-500' : 'border-red-500'}`}>
                  <AlertDescription>
                    <div className="font-semibold mb-2">
                      {results[key].success ? '✅ Success' : '❌ Error'}
                    </div>
                    <div className="text-sm">{results[key].message}</div>
                    {results[key].cookies && (
                      <div className="mt-2">
                        <div className="font-medium">Cookies found: {results[key].totalCookies}</div>
                        {results[key].cookies.map((cookie: any, index: number) => (
                          <div key={index} className="text-xs mt-1">
                            <span className="font-mono">{cookie.name}</span>: {cookie.value} ({cookie.fullLength} chars)
                          </div>
                        ))}
                      </div>
                    )}
                    {results[key].tokenLength && (
                      <div className="mt-2">
                        <div className="font-medium">Token Info:</div>
                        <div className="text-xs">Length: {results[key].tokenLength}</div>
                        <div className="text-xs">Preview: {results[key].tokenPreview}</div>
                      </div>
                    )}
                    {results[key].payload && (
                      <div className="mt-2">
                        <div className="font-medium">JWT Payload:</div>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(results[key].payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">What Was Fixed</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <div className="space-y-2 text-sm">
            <p><strong>Problem:</strong> The original code used a greedy regex pattern that would match the first occurrence of any cookie containing "token" in its name.</p>
            <p><strong>Issue:</strong> When you had both "refresh_token" and "token" cookies, it would extract the refresh token instead of the access token.</p>
            <p><strong>Solution:</strong> Implemented precise cookie parsing that finds the exact cookie name and handles URL encoding/decoding for special characters.</p>
            <p><strong>Result:</strong> Your authentication system now correctly extracts the right token regardless of what other cookies are present.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 