import * as styles from "./Settings.module.scss";
import { centerScroll, pauseKeypress, resumeKeypress, sleep } from "@/lib/utils";
import {
	ThemeStyle,
	animateApp,
	disableDiscordLinkLabels,
	discordClientReady,
	discordSetup,
	ezgifAllowed,
	preserveDeleted,
	setAnimate,
	setDisableDiscordLinkLabels,
	setEmojiVariation,
	setEzgifAllowed,
	setPreserveDeleted,
	setTheme,
	themeStyle,
} from "../signals";
import { useKeypress } from "@/lib/utils";
import SpatialNavigation from "@/lib/spatial_navigation";
import {
	For,
	JSXElement,
	Match,
	Show,
	Switch,
	batch,
	createEffect,
	createSignal,
	onCleanup,
	onMount,
	untrack,
} from "solid-js";
import Marquee from "./components/Marquee";
import MarqueeOrNot from "./components/MarqueeOrNot";
import ButtonBase from "./components/Button";
import localforage from "localforage";
import { slide } from "./modals/slide";
import { OptionsMenu } from "./components/OptionsMenu";
import type { SkinVariation } from "./components/EmojiPicker";
import { DiscordUser } from "discord";
import UserAvatar from "./components/UserAvatar";
import { getStoredAccounts } from "./Loading";
import Logger from "discord/src/Logger";

const focusable = true;

function Toggle(props: { title: string; value: boolean; onChange: (value: boolean) => void }) {
	const [focused, setFocused] = createSignal(false);

	return (
		<div
			on:sn-enter-down={() => {
				props.onChange(!props.value);
			}}
			onFocus={() => {
				setFocused(true);
			}}
			onBlur={() => {
				setFocused(false);
			}}
			tabIndex={-1}
			classList={{ [styles.toggle]: true, focusable }}
		>
			<div class={styles.control_wrap}>
				<div class={styles.text}>
					<MarqueeOrNot marquee={focused()}>{props.title}</MarqueeOrNot>
				</div>
				<div classList={{ [styles._switch]: true, [styles.on]: props.value }}></div>
			</div>
		</div>
	);
}

function Button(props: { onClick: () => void | Promise<void>; children: JSXElement }) {
	const [disabled, setDisabled] = createSignal(false);
	const [focused, setFocused] = createSignal(false);

	async function handleClick() {
		setDisabled(true);
		await props.onClick();
		setDisabled(false);
	}

	return (
		<div class={styles.button_wrap}>
			<ButtonBase
				classList={{ focusable }}
				focused={focused()}
				tabIndex={-1}
				on:sn-enter-down={handleClick}
				onFocus={() => {
					setFocused(true);
				}}
				onBlur={() => {
					setFocused(false);
				}}
				onClick={handleClick}
				disabled={disabled()}
			>
				{props.children}
			</ButtonBase>
		</div>
	);
}

const SN_ID = "settings";

const enum Page {
	Settings,
	About,
	Logs,
}

function Logs() {
	const [logs, setLogs] = createSignal(Logger.read());

	return (
		<div class={styles.logs}>
			<div class={styles.logActions}>
				<Button onClick={() => setLogs(Logger.read())}>Refresh</Button>
				<Button
					onClick={() => {
						Logger.clear();
						setLogs([]);
					}}
				>
					Clear
				</Button>
			</div>
			<Show when={logs().length} fallback={<div class={styles.content}>No saved logs.</div>}>
				<For each={logs().slice().reverse()}>
					{(log) => (
						<div class={styles.logEntry}>
							<div class={styles.logMeta}>
								{new Date(log.time).toLocaleTimeString()} [{log.type}] {log.name}
							</div>
							<div class={styles.logText}>{log.args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")}</div>
						</div>
					)}
				</For>
			</Show>
		</div>
	);
}

export default function Settings(props: { onClose: () => void }) {
	onMount(() => {
		SpatialNavigation.add(SN_ID, {
			selector: `.${styles.settings} .focusable`,
			restrict: "self-only",
		});

		pauseKeypress();

		SpatialNavigation.focus(SN_ID);
	});

	onCleanup(() => {
		SpatialNavigation.remove(SN_ID);
		resumeKeypress();
	});

	const [page, setPage] = createSignal(Page.Settings);

	createEffect(() => {
		page();
		queueMicrotask(() => {
			SpatialNavigation.focus(SN_ID);
		});
	});

	let backspacePaused = false;

	useKeypress(
		"Backspace",
		async () => {
			if (backspacePaused) return;
			switch (page()) {
				case Page.About:
					setPage(Page.Settings);
					break;
				default:
					props.onClose();
			}
		},
		true
	);

	return (
		<div
			class={styles.settings}
			on:sn-willfocus={(e) => {
				centerScroll(e.target as HTMLElement);
			}}
		>
			<div class={styles.header}>
				<Switch>
					<Match when={page() == Page.Settings}>Settings</Match>
					<Match when={page() == Page.About}>Discord4KaiOS</Match>
					<Match when={page() == Page.Logs}>Logs</Match>
				</Switch>
			</div>
			<Switch>
				<Match when={page() == Page.Settings}>
					<Toggle
						title="Dark Mode"
						value={themeStyle() == ThemeStyle.DARK}
						onChange={(val) => {
							setTheme(val ? ThemeStyle.DARK : ThemeStyle.LIGHT);
						}}
					/>
					<Toggle
						title="Enable Animations"
						value={animateApp()}
						onChange={(val) => {
							setAnimate(val);
						}}
					/>
					<Toggle
						title="Preserve Deleted Messages"
						value={preserveDeleted()}
						onChange={(val) => {
							setPreserveDeleted(val);
						}}
					/>
					<Toggle
						title="Disable Discord Link Labels"
						value={disableDiscordLinkLabels()}
						onChange={(val) => {
							setDisableDiscordLinkLabels(val);
						}}
					/>
					<Toggle
						title="Use ezgif for webp"
						value={ezgifAllowed()}
						onChange={(val) => {
							setEzgifAllowed(val);
						}}
					/>
					<div class={styles.buttons}>
						<Button onClick={() => setPage(Page.Logs)}>View Logs</Button>
						<Button
							onClick={async () => {
								const accounts = await getStoredAccounts();
								if (!accounts.length) return;
								const currentToken = await localforage.getItem<string>("token");
								const choices = accounts.map((account, index) => ({
									id: index,
									text: account.user?.global_name || account.user?.username || `Account ${index + 1}`,
								}));
								const actEl = document.activeElement as HTMLElement;
								const close = slide(() => (
									<OptionsMenu
										onSelect={async (index) => {
											await close?.();
											if (index !== null && accounts[index as number]?.token !== currentToken) {
												await localforage.setItem("token", accounts[index as number].token);
												location.reload();
												return;
											}
											actEl.focus();
									}}
									items={choices}
								/>
								));
							}}
						>
							Switch Account
						</Button>
						<Button
							onClick={async () => {
								const actEl = document.activeElement as HTMLElement;
								backspacePaused = true;

								const close = slide(() => (
									<OptionsMenu
										onSelect={async (e) => {
											await close?.();
											backspacePaused = false;
											if (e !== null) {
												const m = await import("./components/EmojiPicker");
												const variations = [null as SkinVariation | null].concat(m.SUPPORTED_VARIATIONS);
												setEmojiVariation(variations[e as number]);
											}

											actEl.focus();
										}}
										items={[
											{ text: "None", icon: () => "👌", id: 0 },
											{
												text: "Light",
												icon: () => "👌🏻",
												id: 1,
											},
											{
												text: "Medium Light",
												icon: () => "👌🏼",
												id: 2,
											},
											{
												text: "Medium",
												icon: () => "👌🏽",
												id: 3,
											},
											{
												text: "Medium Dark",
												icon: () => "👌🏾",
												id: 4,
											},
											{
												text: "Dark",
												icon: () => "👌🏿",
												id: 5,
											},
										]}
									/>
								));
							}}
						>
							Change Emoji Skin Tone
						</Button>
						<Button
							onClick={async () => {
								if (!confirm("You sure?")) return;
								try {
									await discordSetup.logout()?.response();
									await localforage.removeItem("token");
									location.reload();
								} catch {
									alert("Failed to logout");
								}
							}}
						>
							Logout
						</Button>
						<Button
							onClick={() => {
								setPage(Page.About);
							}}
						>
							About
						</Button>
					</div>
				</Match>
				<Match when={page() == Page.About}>
					<About />
				</Match>
				<Match when={page() == Page.Logs}>
					<Logs />
				</Match>
			</Switch>
		</div>
	);
}

function About() {
	const [appName, setAppName] = createSignal("Kori");

	const [dev, setDev] = createSignal(null as null | DiscordUser);

	onMount(() => {
		const isKai3 = import.meta.env.KAIOS == 3;

		if (import.meta.env.DEV) {
			const manifest = import.meta.env.MANIFEST;

			setAppName(manifest.name);
		}

		const client = untrack(discordClientReady);

		const devUserId = "733929955099934741";

		const unsub = client?.waitForUser(devUserId).subscribe((user) => {
			if (user == null) {
				client?.Request.get(`users/${devUserId}/profile`, {})
					.response()
					.then((e) => {
						client.addUser(e.user);
					})
					.catch(() => {});
			}
			setDev(user);
			queueMicrotask(() => {
				unsub?.();
			});
		});

		if (import.meta.env.PROD) {
			const manifestURL = isKai3 ? "/manifest.webmanifest" : "/manifest.webapp";

			fetch(manifestURL).then(async (m) => {
				const manifest = await m.json();

				setAppName(manifest.name);
			});
		}
	});
	return (
		<>
			<div class={styles.icon}>
				<img src="/icon112.png" />
				<div>{import.meta.env.APP_VERSION}</div>
			</div>
			<div
				classList={{
					focusable,
					[styles.content]: true,
				}}
				tabIndex={-1}
			>
				<small>(a.k.a. {appName() || "Sveltecord"})</small> is the first and only actually usable Discord client
				for KaiOS.
			</div>
			<Show when={dev()}>
				<div class={styles.heading}>Developer</div>
				<div tabIndex={-1} classList={{ [styles.user]: true, focusable }}>
					<div class={styles.avatar}>
						<UserAvatar size={32} $={dev()!} />
					</div>
					<div class={styles.desc}>
						<div>Cyan</div>
						<div>cyan2048</div>
					</div>
				</div>
			</Show>
			<div tabIndex={-1} classList={{ focusable, [styles.content]: true }}>
				{appName() || "Sveltecord"} is not affiliated, associated, authorized, endorsed by, or in any way
				officially connected with Discord™, or any of its subsidiaries or its affiliates.
			</div>
		</>
	);
}
