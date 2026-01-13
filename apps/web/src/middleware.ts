import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return req.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        res.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    const { data: { session } } = await supabase.auth.getSession();

    const pathname = req.nextUrl.pathname;

    if (!session && pathname.startsWith("/channels")) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    if (session && pathname === "/login") {
        return NextResponse.redirect(new URL("/channels", req.url));
    }

    return res;
}

export const config = {
    matcher: ["/channels/:path*", "/login"],
};
