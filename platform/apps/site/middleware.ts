import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { stackServerApp } from "@repo/auth";

export async function middleware(request: NextRequest) {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.redirect(new URL('/handler/sign-in', request.url));
    }
    return NextResponse.next();
  }
  
  export const config = {
    // You can add your own route protection logic here
    // Make sure not to protect the root URL, as it would prevent users from accessing static Next.js files or Stack's /handler path
    matcher: '/dashboard/:path*',
  };
  