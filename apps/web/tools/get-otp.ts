import * as OTPAuth from 'otpauth';

const totp = new OTPAuth.TOTP({ secret: process.env.TOTP_SECRET });
const code = totp.generate();

console.log(code);
