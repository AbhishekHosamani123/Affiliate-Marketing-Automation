import { NextResponse } from "next/server"

export async function GET() {
    return NextResponse.json(
        { error: "This API route is deprecated. API posting actions are now hosted on the external Render Express backend." },
        { status: 410 } // 410 Gone
    )
}

export async function POST() {
    return NextResponse.json(
        { error: "This API route is deprecated. API posting actions are now hosted on the external Render Express backend." },
        { status: 410 } // 410 Gone
    )
}
