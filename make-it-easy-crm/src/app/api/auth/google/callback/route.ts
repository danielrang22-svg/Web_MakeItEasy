import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import prisma from "@/lib/prisma";

const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET);
const COOKIE_NAME = "mie-auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      console.error("[AUTH:GOOGLE] OAuth error:", error);
      return NextResponse.redirect(new URL("/login?error=oauth_denied", request.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(new URL("/login?error=config_error", request.url));
    }

    console.log("[AUTH:GOOGLE] Exchanging code for tokens...");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[AUTH:GOOGLE] Token exchange failed:", tokenResponse.status, errorText);
      return NextResponse.redirect(new URL("/login?error=token_error", request.url));
    }

    console.log("[AUTH:GOOGLE] Token exchange successful");

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(new URL("/login?error=userinfo_error", request.url));
    }

    const userInfo = await userInfoResponse.json();
    const email: string = userInfo.email?.toLowerCase().trim();

    console.log("[AUTH:GOOGLE] User email from Google:", email);

    if (!email) {
      console.error("[AUTH:GOOGLE] No email in Google response");
      return NextResponse.redirect(new URL("/login?error=no_email", request.url));
    }

    const user = await prisma.usuario.findUnique({
      where: { email },
    });

    console.log("[AUTH:GOOGLE] User found in DB:", user ? `${user.email} (${user.nombre})` : "NOT FOUND");

    if (!user || !user.activo) {
      console.error("[AUTH:GOOGLE] User not authorized:", email);
      return NextResponse.redirect(
        new URL("/login?error=unauthorized", request.url)
      );
    }

    const token = await new SignJWT({
      email: user.email,
      role: user.rol,
      nombre: user.nombre,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(AUTH_SECRET);

    console.log("[AUTH:GOOGLE] JWT signed, redirecting to /");

    const response = NextResponse.redirect(new URL("http://localhost:3000/"));
    //const response = NextResponse.redirect(new URL("/", request.url));

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      secure: false,
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
    });

    response.cookies.set({
      name: "mie-role",
      value: user.rol,
      httpOnly: false,
      path: "/",
      secure: false,
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
    });

    console.log("[AUTH:GOOGLE] Cookies set, returning redirect response");
    return response;
  } catch (error) {
    console.error("[AUTH:GOOGLE:CALLBACK] Error:", error);
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
}
