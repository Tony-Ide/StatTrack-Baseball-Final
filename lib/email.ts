// Email service using Resend
// You can also integrate with services like:
// - SendGrid
// - AWS SES
// - Nodemailer with SMTP

import { Resend } from 'resend'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text: string
}

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    // Validate required environment variables
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    
    if (!process.env.FROM_EMAIL) {
      throw new Error('FROM_EMAIL environment variable is not set')
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    if (error) {
      console.error('Email sending failed:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log('Email sent successfully:', data)
    
  } catch (error) {
    console.error('Error sending email:', error)
    
    // In development, still log the email details for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('=== EMAIL SENT (DEV MODE) ===')
      console.log('To:', options.to)
      console.log('Subject:', options.subject)
      console.log('Text:', options.text)
      console.log('HTML:', options.html)
      console.log('============================')
    }
    
    throw error
  }
}

// Alternative implementations for other email services:

// SendGrid implementation:
// export async function sendEmailWithSendGrid(options: EmailOptions): Promise<void> {
//   const sgMail = require('@sendgrid/mail')
//   sgMail.setApiKey(process.env.SENDGRID_API_KEY)
//   
//   await sgMail.send({
//     to: options.to,
//     from: process.env.FROM_EMAIL,
//     subject: options.subject,
//     text: options.text,
//     html: options.html,
//   })
// }

// AWS SES implementation:
// export async function sendEmailWithSES(options: EmailOptions): Promise<void> {
//   const AWS = require('aws-sdk')
//   const ses = new AWS.SES({
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     region: process.env.AWS_REGION || 'us-east-1'
//   })
//   
//   await ses.sendEmail({
//     Source: process.env.FROM_EMAIL,
//     Destination: { ToAddresses: [options.to] },
//     Message: {
//       Subject: { Data: options.subject },
//       Body: {
//         Text: { Data: options.text },
//         Html: { Data: options.html }
//       }
//     }
//   }).promise()
// }
