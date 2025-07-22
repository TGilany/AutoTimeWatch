
import { NextRequest, NextResponse } from "next/server";

const API_URL = "http://localhost:5000/TimeWatch";

export async function POST(req: NextRequest) {
  const { action, ...body } = await req.json();

  let apiUrl = "";
  switch (action) {
    case "punchIn":
      apiUrl = `${API_URL}/punchIn`;
      break;
    case "punchOut":
      apiUrl = `${API_URL}/punchOut`;
      break;
    case "punchAll":
      apiUrl = `${API_URL}/punchAll`;
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
