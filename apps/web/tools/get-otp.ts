import * as OTPAuth from 'otpauth';

if (!process.env.TOTP_SECRET) {
  throw new Error('TOTP_SECRET is not set');
}

const totp = new OTPAuth.TOTP({ secret: process.env.TOTP_SECRET });
const code = totp.generate();

console.log(code);
