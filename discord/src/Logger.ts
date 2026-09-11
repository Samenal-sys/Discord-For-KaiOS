// @ts-ignore
import prune from "json-prune";

interface Log {
	time: string;
	type: string;
	args: any[];
	name: string;
	stack?: string;
}

type Console = typeof console;
type consoleTypes = keyof Console;
/**
 *
 * stolen from betterdiscord
 */
export default class Logger {
	static file: Log[] = [];
	static logToFile = false;
	static disabledNames: string[] = [];
	static disabled = false;
	static storageKey = "kori-logs";
	static maxLogs = 300;

	static read(): Log[] {
		try {
			return JSON.parse(localStorage.getItem(Logger.storageKey) || "[]");
		} catch {
			return [];
		}
	}

	static clear() {
		Logger.file = [];
		localStorage.removeItem(Logger.storageKey);
	}

	constructor(public name: string, public color: string = "#3E82E5") {}

	stacktrace(message: string, error: any) {
		console.error(
			`%c[${this.name}]%c ${message}\n\n%c`,
			"color: #3a71c1; font-weight: 700;",
			"color: red; font-weight: 700;",
			"color: red;",
			error
		);
	}

	err(...args: any[]) {
		return this._log("error", ...args);
	}

	error(...args: any[]) {
		return this._log("error", ...args);
	}

	warn(...args: any[]) {
		return this._log("warn", ...args);
	}

	info(...args: any[]) {
		return this._log("info", ...args);
	}

	dbg(...args: any[]) {
		return this._log("debug", ...args);
	}

	debug(...args: any[]) {
		return this._log("debug", ...args);
	}

	log(...args: any[]) {
		return this._log("log", ...args);
	}

	private _log(type: consoleTypes, ...args: any[]) {
		if (Logger.disabled || Logger.disabledNames.includes(this.name)) return () => {};

		const safeArgs = args.map((arg) => {
			try {
				JSON.stringify(arg);
				return arg;
			} catch {
				return String(arg);
			}
		});
		const entry: Log = { time: new Date().toISOString(), name: this.name, type: String(type), args: safeArgs };
		Logger.file.push(entry);
		Logger.file = Logger.file.slice(-Logger.maxLogs);
		try {
			localStorage.setItem(Logger.storageKey, JSON.stringify(Logger.file));
		} catch {}

		return () => {
			try {
				(console[type] as (...values: any[]) => void)(`[${this.name}]`, ...args);
			} catch {}
		};
	}

	// static fileLog(name: string, type: string, args: any[], stack?: string) {
	// 	setTimeout(() => {
	// 		const obj = {
	// 			name,
	// 			type,
	// 			args,
	// 			stack,
	// 		};
	//
	// 		Logger.file.push(obj);
	// 	}, 5 + Math.floor(100 * Math.random()));
	// }
	//
	// static exportFile() {
	// 	return prune(Logger.file, {
	// 		allProperties: true,
	// 		inheritedProperties: true,
	// 		// replacer: function r(value: any, defaultValue: any, circular: any) {
	// 		// 	if (typeof value === "object" && !circular) {
	// 		// 		return prune(value, {
	// 		// 			allProperties: true,
	// 		// 			inheritedProperties: true,
	// 		// 			replacer: r,
	// 		// 		});
	// 		// 	}
	// 		// 	return defaultValue;
	// 		// },
	// 	});
	// }
}
