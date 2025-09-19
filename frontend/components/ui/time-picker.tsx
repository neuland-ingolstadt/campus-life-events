"use client";

import { Input } from "@/components/ui/input";

export type TimeValue = string | null;

export default function TimePicker({
	value,
	onValueChange,
}: {
	value: TimeValue;
	onValueChange: (val: TimeValue) => void;
}) {
	return (
		<Input
			type="time"
			value={value ?? ""}
			onChange={(e) => onValueChange(e.target.value || null)}
			className="w-full"
		/>
	);
}
