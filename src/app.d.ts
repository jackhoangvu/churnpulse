// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SignalStatus, SignalType } from '$lib/types';

declare global {
	interface Window {
		THREE?: {
			Scene: new () => {
				add(object: unknown): void;
			};
			WebGLRenderer: new (options: {
				antialias: boolean;
				alpha: boolean;
				powerPreference: string;
			}) => {
				domElement: HTMLCanvasElement;
				setPixelRatio(value: number): void;
				setSize(width: number, height: number, updateStyle?: boolean): void;
				render(scene: unknown, camera: unknown): void;
				dispose(): void;
			};
			OrthographicCamera: new (
				left: number,
				right: number,
				top: number,
				bottom: number,
				near: number,
				far: number
			) => {
				left: number;
				right: number;
				top: number;
				bottom: number;
				position: {
					x: number;
					y: number;
					z: number;
				};
				updateProjectionMatrix(): void;
			};
			BufferGeometry: new () => {
				attributes: {
					position: {
						needsUpdate?: boolean;
					};
				};
				setAttribute(name: string, attribute: { needsUpdate?: boolean }): void;
				dispose(): void;
			};
			BufferAttribute: new (
				array: Float32Array,
				itemSize: number
			) => {
				needsUpdate?: boolean;
			};
			PointsMaterial: new (options: {
				size: number;
				transparent: boolean;
				opacity: number;
				vertexColors: boolean;
			}) => {
				dispose(): void;
				clone(): {
					dispose(): void;
					clone(): unknown;
				};
			};
			Points: new (
				geometry: unknown,
				material: unknown
			) => {
				rotation: {
					x: number;
					y: number;
					z: number;
				};
			};
			MeshBasicMaterial: new (options: {
				color: number;
				wireframe: boolean;
				transparent: boolean;
				opacity: number;
			}) => {
				opacity?: number;
				dispose(): void;
				clone(): {
					opacity?: number;
					dispose(): void;
					clone(): unknown;
				};
			};
			Mesh: new (
				geometry: unknown,
				material: {
					opacity?: number;
					dispose(): void;
					clone(): unknown;
				}
			) => {
				material: {
					opacity?: number;
					dispose(): void;
					clone(): unknown;
				};
				rotation: {
					x: number;
					y: number;
					z: number;
				};
				position: {
					x: number;
					y: number;
					z: number;
					set(x: number, y: number, z: number): void;
				};
				scale: {
					setScalar(value: number): void;
				};
			};
			IcosahedronGeometry: new (radius: number, detail: number) => {
				dispose(): void;
			};
		};
	}

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
