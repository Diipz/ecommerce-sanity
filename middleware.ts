import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import arcjet, { fixedWindow } from "@arcjet/next";
import { NextResponse } from "next/server";

// export default clerkMiddleware();

// Initialize Arcjet middleware with its configuration
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    fixedWindow({
      mode: "LIVE",
      window: "1h",
      max: 10,
    }),
  ],
});


const isProtectedRoute = createRouteMatcher(["/((?!webhook).*)"]);

export default clerkMiddleware(async (auth, req) => {
  // May add additional protected routes
  if (isProtectedRoute(req)) await auth.protect();

  aj.protect(req);
  

  return NextResponse.next();
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};