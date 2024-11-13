import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import arcjet, { fixedWindow, createMiddleware } from "@arcjet/next";
import { NextResponse } from "next/server";

// import { clerkMiddleware } from "@clerk/nextjs/server";


// const arcjetMware =  createMiddleware(aj);

// Arcjet blocks webhooks by default which should be excluded as below
const isProtectedRoute = createRouteMatcher(["/((?!webhook).*)"]);

const clerk = clerkMiddleware(async (auth, req) => {
  // May add additional protected routes
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
  return NextResponse.next();
})

 // Initialize Arcjet middleware with its configuration
 const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    fixedWindow({
      mode: "LIVE",
      window: "1h",
      max: Number(process.env.ARCJET_API_LIMIT),
    }),
  ],
});

export default createMiddleware(aj, clerk);

// export default clerkMiddleware();

 
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};