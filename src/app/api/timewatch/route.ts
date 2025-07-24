import { type NextRequest, NextResponse } from "next/server";

const TIME_WATCH_BASE_URL = "https://c.timewatch.co.il";
const TIME_WATCH_LOGIN_URL = "user/validate_user.php";
const TIME_WATCH_PUNCH_URL = "punch/punch3.php";
const TIME_WATCH_PUNCH_ALL_URL = "punch/editwh3.php";

interface TimeWatchRequest {
	company: string;
	employeeId: string;
	password: string;
	year?: number;
	month?: number;
	startHour?: string;
	endHour?: string;
	reportingOptions?: number; // 0 for punch in, 1 for punch out
}

interface TimeWatchLoginResponse {
	cookie: string;
	ixEmployee: string;
	token: string;
}

async function loginToTimeWatch(
	requestData: TimeWatchRequest,
): Promise<TimeWatchLoginResponse | null> {
	try {
		const formData = new URLSearchParams();
		formData.append("comp", requestData.company);
		formData.append("name", requestData.employeeId);
		formData.append("pw", requestData.password);

		const loginResponse = await fetch(
			`${TIME_WATCH_BASE_URL}/${TIME_WATCH_LOGIN_URL}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: formData,
				redirect: 'manual', // Don't follow redirects automatically
			},
		);

		// Accept both 200 OK and 302 Found as successful login responses
		if (!loginResponse.ok && loginResponse.status !== 302) {
			return null;
		}

		// For 302 redirects, we need to extract auth data from headers/cookies
		if (loginResponse.status === 302) {
			// Extract cookies and other auth data from the redirect response
			const setCookieHeader = loginResponse.headers.get('set-cookie');
			const locationHeader = loginResponse.headers.get('location');
			
			if (!setCookieHeader) {
				return null;
			}

			// Parse PHPSESSID from set-cookie header
			const sessionMatch = setCookieHeader.match(/PHPSESSID=([^;]+)/);
			const sessionId = sessionMatch ? sessionMatch[1] : null;

			if (!sessionId || !locationHeader) {
				return null;
			}

			// Extract ixEmployee and token from the redirect URL
			const url = new URL(locationHeader, TIME_WATCH_BASE_URL);
			const ixEmployee = url.searchParams.get('ixEmployee') || url.searchParams.get('e') || '';
			const token = url.searchParams.get('csrf_token') || url.searchParams.get('token') || '';

			// If we can't extract the necessary parameters, follow the redirect to get them
			if (!ixEmployee || !token) {
				try {
					const redirectResponse = await fetch(`${TIME_WATCH_BASE_URL}${locationHeader}`, {
						method: 'GET',
						headers: {
							cookie: `PHPSESSID=${sessionId}`,
						},
					});

					if (redirectResponse.ok) {
						const redirectText = await redirectResponse.text();
						
						// Extract ixEmployee from the response HTML or URL
						const ixEmployeeMatch = redirectText.match(/ixEmployee["\s]*[:=]["\s]*([^"'\s,}]+)/i) ||
											   redirectText.match(/employee["\s]*[:=]["\s]*([^"'\s,}]+)/i) ||
											   redirectText.match(/e["\s]*[:=]["\s]*(\d+)/);
						const extractedIxEmployee = ixEmployeeMatch ? ixEmployeeMatch[1] : ixEmployee;

						// Extract CSRF token from the response HTML
						const tokenMatch = redirectText.match(/csrf_token["\s]*[:=]["\s]*([^"'\s,}]+)/i) ||
										  redirectText.match(/token["\s]*[:=]["\s]*([^"'\s,}]+)/i) ||
										  redirectText.match(/_token["\s]*[:=]["\s]*([^"'\s,}]+)/i);
						const extractedToken = tokenMatch ? tokenMatch[1] : token;

						return {
							cookie: sessionId,
							ixEmployee: extractedIxEmployee,
							token: extractedToken,
						};
					}
				} catch {
					// If redirect fetch fails, return what we have
				}
			}

			return {
				cookie: sessionId,
				ixEmployee: ixEmployee,
				token: token,
			};
		}

		// For 200 responses, parse JSON as before
		return await loginResponse.json();
	} catch {
		return null;
	}
}

export async function POST(req: NextRequest) {
	try {
		const { action, ...requestData }: { action: string } & TimeWatchRequest =
			await req.json();

		if (!action) {
			return NextResponse.json(
				{ error: "Action is required" },
				{ status: 400 },
			);
		}

		if (
			!requestData.company ||
			!requestData.employeeId ||
			!requestData.password
		) {
			return NextResponse.json(
				{
					error:
						"Missing required fields: company, employeeId, and password are required",
				},
				{ status: 400 },
			);
		}

		// Handle login action separately
		if (action === "login") {
			const loginResult = await loginToTimeWatch(requestData);
			if (!loginResult) {
				return NextResponse.json({ error: "Login failed" }, { status: 401 });
			}
			return NextResponse.json(loginResult);
		}

		// For punch actions, authenticate first
		const loginResult = await loginToTimeWatch(requestData);
		if (!loginResult) {
			return NextResponse.json(
				{ error: "Authentication failed" },
				{ status: 401 },
			);
		}

		let apiUrl = "";
		switch (action) {
			case "punchIn":
				apiUrl = `${TIME_WATCH_BASE_URL}/${TIME_WATCH_PUNCH_URL}`;
				break;
			case "punchOut":
				apiUrl = `${TIME_WATCH_BASE_URL}/${TIME_WATCH_PUNCH_URL}`;
				break;
			case "punchAll":
				apiUrl = `${TIME_WATCH_BASE_URL}/${TIME_WATCH_PUNCH_ALL_URL}`;
				if (!requestData.year || !requestData.month) {
					return NextResponse.json(
						{
							error: "Year and month are required for punchAll action",
						},
						{ status: 400 },
					);
				}
				if (!requestData.startHour || !requestData.endHour) {
					return NextResponse.json(
						{
							error: "startHour and endHour are required for punchAll action",
						},
						{ status: 400 },
					);
				}
				break;
			default:
				return NextResponse.json(
					{
						error:
							"Invalid action. Valid actions are: login, punchIn, punchOut, punchAll",
					},
					{ status: 400 },
				);
		}

		// Call punch endpoint with authentication data
		let response: Response;

		if (action === "punchAll") {
			// PunchAll uses single form submission to editwh3.php
			const year = requestData.year || new Date().getFullYear();
			const month = requestData.month || new Date().getMonth() + 1;
			const startHour = requestData.startHour?.padStart(2, "0") || "09";
			const endHour = requestData.endHour?.padStart(2, "0") || "18";
			
			const formData = new URLSearchParams();
			
			// Main form parameters matching the example payload
			formData.append("e", loginResult.ixEmployee);
			formData.append("tl", loginResult.ixEmployee);
			formData.append("c", requestData.company);
			
			// Date parameters
			const lastDay = new Date(year, month, 0).getDate(); // Last day of month
			const dDate = `${year}-${month.toString().padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`;
			const jdDate = `${year}-${month.toString().padStart(2, "0")}-01`;
			
			formData.append("d", dDate);
			formData.append("jd", jdDate);
			formData.append("nextdate", "");
			formData.append("atypehidden", "0");
			formData.append("inclcontracts", "0");
			formData.append("job", "0");
			formData.append("allowabsence", "3");
			formData.append("allowremarks", "1");
			formData.append("csrf_token", loginResult.token);
			formData.append("atype", "0");
			
			// Time entries for the first working day (day 0)
			formData.append("emm0", "00");
			formData.append("ehh0", startHour);
			formData.append("xmm0", "00");
			formData.append("xhh0", endHour);
			formData.append("task0", "0");
			formData.append("taskdescr0", "");
			formData.append("what0", "1");
			
			// Empty entries for other possible days (1-4)
			for (let i = 1; i <= 4; i++) {
				formData.append(`emm${i}`, "");
				formData.append(`ehh${i}`, "");
				formData.append(`xmm${i}`, "");
				formData.append(`xhh${i}`, "");
				formData.append(`task${i}`, "0");
				formData.append(`taskdescr${i}`, "");
				formData.append(`what${i}`, "1");
			}
			
			formData.append("excuse", "0");
			formData.append("atype", "0");
			formData.append("teken", "0");
			formData.append("remark", "");

			response = await fetch(apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					cookie: `PHPSESSID=${loginResult.cookie}`,
					origin: "https://c.timewatch.co.il",
					referer: `https://c.timewatch.co.il/punch/editwh2.php?e=${loginResult.ixEmployee}&tl=${loginResult.ixEmployee}&d=${jdDate}`,
				},
				body: formData,
			});
		} else {
			// Regular punch (in/out)
			const formData = new URLSearchParams();
			formData.append("comp", requestData.company);
			formData.append("name", requestData.employeeId);
			formData.append("ix", loginResult.ixEmployee);
			formData.append("type", action === "punchIn" ? "0" : "1");
			formData.append("allowremarks", "1");
			formData.append("msgfound", "0");
			formData.append("thetask", "0");
			formData.append("teamleader", "0");
			formData.append("prevtask", "0");
			formData.append("defaultTask", "0");
			formData.append("withtasks", "0");
			formData.append("restricted", "1");
			formData.append("csrf_token", loginResult.token);

			response = await fetch(apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					cookie: `PHPSESSID=${loginResult.cookie}`,
					origin: "https://c.timewatch.co.il",
					referer: "https://c.timewatch.co.il/punch/punch2.php",
				},
				body: formData,
			});
		}

		const responseText = await response.text();
		
		// If response is not ok or contains "error", return error details
		if (!response.ok || responseText.toLowerCase().includes('error')) {
			return NextResponse.json(
				{
					error: `TimeWatch API error: ${response.statusText}`,
					details: responseText,
					status: response.status,
					headers: Object.fromEntries(response.headers.entries()),
				},
				{ status: response.ok ? 400 : response.status },
			);
		}
		
		// Try to parse as JSON first, fallback to text if it fails
		let data: any;
		try {
			data = JSON.parse(responseText);
		} catch {
			// If not JSON, return the raw text response
			data = { message: responseText, success: true };
		}
		
		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "An unknown error occurred";
		return NextResponse.json(
			{ error: "Internal Server Error", details: errorMessage },
			{ status: 500 },
		);
	}
}
