// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SignalStatus, SignalType } from '$lib/types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session?:
				| {
						userId: string;
						claims: Record<string, unknown>;
				  }
				| undefined;
		}
		interface PageData {
			title?: string;
			breadcrumb?: string[];
			signalStatus?: SignalStatus;
			signalType?: SignalType;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
