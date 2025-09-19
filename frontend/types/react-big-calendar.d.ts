declare module "react-big-calendar" {
	import { ComponentType, ReactNode } from "react";
	import { Moment } from "moment";

	export interface CalendarEvent {
		id?: string | number;
		title: string;
		start: Date;
		end: Date;
		resource?: any;
	}

	export interface CalendarProps {
		localizer: any;
		events: CalendarEvent[];
		startAccessor: string;
		endAccessor: string;
		onSelectEvent?: (event: CalendarEvent) => void;
		onSelectSlot?: (slotInfo: any) => void;
		selectable?: boolean;
		style?: React.CSSProperties;
		className?: string;
		views?: string[];
		defaultView?: string;
		popup?: boolean;
		eventPropGetter?: (event: CalendarEvent) => React.CSSProperties;
		components?: {
			event?: ComponentType<{ event: CalendarEvent }>;
		};
		messages?: {
			allDay?: string;
			previous?: string;
			next?: string;
			today?: string;
			month?: string;
			week?: string;
			day?: string;
			agenda?: string;
			date?: string;
			time?: string;
			event?: string;
			noEventsInRange?: string;
			showMore?: (total: number) => string;
		};
	}

	export const Calendar: ComponentType<CalendarProps>;
	export const momentLocalizer: (moment: any) => any;
}
