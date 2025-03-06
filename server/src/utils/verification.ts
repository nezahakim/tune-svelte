import { createTransport } from 'nodemailer';

export function generateRandomCode(length: number): string {
    return Math.random()
        .toString()
        .slice(2, 2 + length);
}


const transporter = createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: "8726d7001@smtp-brevo.com",
        pass: "DzQpRC027nHgmUhL"
    },
    tls: {
        rejectUnauthorized: true  // Change to true for production
    }
});

transporter.verify((error, success) => {
    if (error) {
      console.error("SMTP Connection Error:", error);
    } else {
      console.log("SMTP Connection Successful!");
    }
});

export async function sendVerificationEmail(
    email: string, 
    code: string
): Promise<void> {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification',
        html: `
            <h1>Email Verification</h1>
            <p>Your verification code is: <strong>${code}</strong></p>
            <p>This code will expire in 15 minutes.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Email sending failed:', error);
        throw new Error('Failed to send verification email');
    }
}