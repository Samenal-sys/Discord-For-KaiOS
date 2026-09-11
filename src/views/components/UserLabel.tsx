import { DiscordUser, DiscordGuild, DiscordServerProfile } from "discord";
import { decimal2rgb, useStore } from "../../lib/utils";
import { Show } from "solid-js";
import * as styles from "./UserLabel.module.scss";

const userLabelStyles = styles as unknown as {
	serverTag: string;
	serverTagBadge: string;
	roleIcon: string;
};

function UserLabelServerTag(props: { $: DiscordUser }) {
	const clan = useStore(() => props.$, "clan");

	return (
		<Show when={clan()?.identity_enabled && clan()?.tag}>
			{(tag) => (
					<span class={userLabelStyles.serverTag} title={`Server Tag: ${tag()}`}>
					<Show when={clan()?.badge}>
						<img
								class={userLabelStyles.serverTagBadge}
							src={`https://cdn.discordapp.com/clan-badges/${clan()!.identity_guild_id}/${clan()!.badge}.png?size=16`}
							alt=""
						/>
					</Show>
					{tag()}
				</span>
			)}
		</Show>
	);
}

function UserLabelNicknameProfile(props: {
	$: DiscordUser;
	guild: DiscordGuild;
	profile: DiscordServerProfile;
	prefix?: string;
	color?: boolean;
	roleIcon?: boolean;
}) {
	const nick = useStore(() => props.profile, "nick");
	const roles = useStore(() => props.profile, "roles");
	const guild_roles = useStore(() => props.guild, "roles");

	const role = () => {
		// i hope the compiler gets what i'm saying
		const _roles = roles();

		return guild_roles()
			.slice()
			.sort((a, b) => b.position - a.position)
			.find((a) => {
				const colors = (a as any).colors;
				return _roles.includes(a.id) && (a.color !== 0 || colors?.primary_color || colors?.secondary_color || colors?.tertiary_color || (a as any).icon);
			});
	};

	const color = () => role()?.color ?? null;
	const roleColors = () => {
		const colors = (role() as any)?.colors;
		return [colors?.primary_color, colors?.secondary_color, colors?.tertiary_color]
			.filter((value): value is number => typeof value === "number")
			.map((value) => `rgb(${decimal2rgb(value, true)})`);
	};
	const roleIcon = () => (role() as any)?.icon as string | null | undefined;
	const roleStyle = () => {
		if (!props.color) return undefined;
		const colors = roleColors();
		if (colors.length > 1) return { background: `linear-gradient(90deg, ${colors.join(", ")})`, "-webkit-background-clip": "text", color: "transparent" };
		return props.color && color() ? { color: `rgb(${decimal2rgb(color()!, true)})` } : undefined;
	};

	const children = () => nick() ?? <UserLabelRelationshipNickname $={props.$} />;
	const prefix = props.prefix ?? "";

	return (
		<span style={roleStyle()}>
			{prefix}
			{children()}
			<Show when={props.roleIcon !== false && roleIcon()}>
				<img
					class={userLabelStyles.roleIcon}
					src={`https://cdn.discordapp.com/role-icons/${role()!.id}/${roleIcon()}.png?size=16`}
					alt=""
				/>
			</Show>
		</span>
	);
}

function UserLabelNicknameGuild(props: {
	$: DiscordUser;
	guild: DiscordGuild;
	prefix?: string;
	color: boolean;
	roleIcon?: boolean;
}) {
	let profile = props.$.profiles.get(props.guild.id);

	if (!profile) {
		profile = props.$.profiles.insert(
			{
				user: props.$.$,
				roles: [],
				nick: null,
				mute: false,
				deaf: false,
				joined_at: "",
				flags: 1,
			},
			props.guild
		);
	}

	return <UserLabelNicknameProfile profile={profile} {...props} />;
}

function UserLabelRelationshipNickname(props: { $: DiscordUser; prefix?: string }) {
	const nick = useStore(() => props.$.relationship, "nickname");

	return (
		<>
			{props.prefix ?? ""}
			<Show when={nick()} fallback={<UserLabelGlobalName $={props.$} />}>
				{nick()}
			</Show>
		</>
	);
}

function UserLabelGlobalName(props: { $: DiscordUser; prefix?: string }) {
	const global_name = useStore(() => props.$, "global_name");
	const username = useStore(() => props.$, "username");

	return (
		<>
			{props.prefix ?? ""}
			{global_name() || username()}
		</>
	);
}

export default function UserLabel(props: {
	$: DiscordUser;
	nickname?: boolean;
	guild?: DiscordGuild | null;
	prefix?: string;
	color?: boolean;
	serverTag?: boolean;
	roleIcon?: boolean;
}) {
	return (
		<Show when={props.$} fallback={"Error"}>
			<Show
				when={
					// if nickname and not a webhook
					props.nickname && !(props.$.value.bot && props.$.value.discriminator == "0000")
				}
				fallback={<UserLabelGlobalName prefix={props.prefix} $={props.$} />}
			>
				<Show when={props.guild} fallback={<UserLabelRelationshipNickname prefix={props.prefix} $={props.$} />}>
					<UserLabelNicknameGuild
						prefix={props.prefix}
						$={props.$}
						guild={props.guild!}
						color={props.color ?? false}
						roleIcon={props.roleIcon}
					/>
				</Show>
			</Show>
			<Show when={props.serverTag !== false}>
				<UserLabelServerTag $={props.$} />
			</Show>
		</Show>
	);
}
