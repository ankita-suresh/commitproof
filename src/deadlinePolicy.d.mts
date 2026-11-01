import type {Candidate,Source} from './domain';
export function validDate(value: unknown): value is string;
export function displayDeadline(value: string | null): string;
export function nextWeekday(meetingDate: string, weekday: number): string;
export function normalizeDeadlines<T extends {tasks: Candidate[];notice: string}>(result:T,sources:Source[],meetingDate:string):T;
