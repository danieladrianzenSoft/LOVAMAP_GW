/// <reference types="vite/client" />

declare module 'n3' {
	export class Parser {
		parse(input: string): Quad[];
	}

	export interface Quad {
		subject: Term;
		predicate: Term;
		object: Term & { datatypeString?: string };
		graph: Term;
	}

	export interface Term {
		termType: string;
		value: string;
	}
}
