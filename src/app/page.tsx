"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
	employeeId: z.string().min(1, { message: "Employee ID is required" }),
	company: z.string().min(1, { message: "Company is required" }),
	password: z.string().min(1, { message: "Password is required" }),
	startHour: z.string().optional(),
	endHour: z.string().optional(),
	year: z.string().optional(),
	month: z.string().optional(),
});

export default function Home() {
	const [apiResponse, setApiResponse] = useState<string | null>(null);
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			employeeId: "",
			company: "",
			password: "",
			startHour: "",
			endHour: "",
			year: "",
			month: "",
		},
	});

	const onSubmit = async (
		values: z.infer<typeof formSchema>,
		action: "punchIn" | "punchOut" | "punchAll",
	) => {
		const response = await fetch("/api/timewatch", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ ...values, action }),
		});
		const data = await response.json();
		setApiResponse(JSON.stringify(data, null, 2));
	};

	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-24">
			<div className="w-full max-w-2xl">
				<pre className="text-center mb-2 text-xs">
					{`
████████╗██╗███╗   ███╗███████╗██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗
╚══██╔══╝██║████╗ ████║██╔════╝██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║
   ██║   ██║██╔████╔██║█████╗  ██║ █╗ ██║███████║   ██║   ██║     ███████║
   ██║   ██║██║╚██╔╝██║██╔══╝  ██║███╗██║██╔══██║   ██║   ██║     ██╔══██║
   ██║   ██║██║ ╚═╝ ██║███████╗╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║
   ╚═╝   ╚═╝╚═╝     ╚═╝╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
`}
				</pre>
				<div className='text-center pb-4 text-xs'>Report Your Working Hours</div>
				<Card>
					<CardContent>
						<Form {...form}>
							<form className="space-y-8">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<FormField
										control={form.control}
										name="employeeId"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Employee ID</FormLabel>
												<FormControl>
													<Input placeholder="Your employee ID" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="company"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Company</FormLabel>
												<FormControl>
													<Input placeholder="Your company" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="password"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Password</FormLabel>
												<FormControl>
													<Input
														type="password"
														placeholder="Your password"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<Tabs defaultValue="punchAll" className="w-full">
									<TabsList className="grid w-full grid-cols-2">
										<TabsTrigger value="punchAll">Punch All</TabsTrigger>
										<TabsTrigger value="punchInOut">Punch In/Out</TabsTrigger>
									</TabsList>
																		<TabsContent value="punchAll" className="min-h-[230px]">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
											<FormField
												control={form.control}
												name="startHour"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Start Hour</FormLabel>
														<FormControl>
															<Input placeholder="e.g., 09:00" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="endHour"
												render={({ field }) => (
													<FormItem>
														<FormLabel>End Hour</FormLabel>
														<FormControl>
															<Input placeholder="e.g., 18:00" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="year"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Year</FormLabel>
														<FormControl>
															<Input placeholder="e.g., 2025" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="month"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Month</FormLabel>
														<FormControl>
															<Input placeholder="e.g., 7" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
										<div className="flex justify-center pt-4">
											<Button
												onClick={form.handleSubmit((values) =>
													onSubmit(values, "punchAll"),
												)}
											>
												Punch All
											</Button>
										</div>
									</TabsContent>
									<TabsContent value="punchInOut" className="min-h-[230px]">
										<div className="flex h-full items-center justify-center gap-4 pt-4">
											<Button
												onClick={form.handleSubmit((values) =>
													onSubmit(values, "punchIn"),
												)}
											>
												Punch In
											</Button>
											<Button
												onClick={form.handleSubmit((values) =>
													onSubmit(values, "punchOut"),
												)}
												variant="outline"
											>
												Punch Out
											</Button>
										</div>
									</TabsContent>
								</Tabs>
							</form>
						</Form>
					</CardContent>
				</Card>
			</div>
			{apiResponse && (
				<Card className="w-full max-w-2xl mt-8">
					<CardHeader>
						<CardTitle>API Response</CardTitle>
					</CardHeader>
					<CardContent>
						<pre>{apiResponse}</pre>
					</CardContent>
				</Card>
			)}
		</main>
	);
}
