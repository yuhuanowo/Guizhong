'''
The `Customization` cog for IgKnite.
---

License can be found here:
https://github.com/IgKniteDev/IgKnite/blob/main/LICENSE
'''


# Imports.
import disnake
from disnake import ChannelType, Option, OptionChoice, OptionType
from disnake.ext import commands

import core
from core.datacls import LockRoles


# Hex to RGB converter.
def get_color(hex: str) -> disnake.Colour:
    hex = hex.lstrip('#')
    try:
        color = tuple(int(hex[i : i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return disnake.Colour.default()
    return disnake.Colour.from_rgb(*color)


# The actual cog.
class Customization(commands.Cog):
    def __init__(self, bot: core.IgKnite) -> None:
        self.bot = bot

    async def cog_before_slash_command_invoke(self, inter: disnake.CommandInteraction) -> None:
        return await inter.response.defer()

    # makerole
    @commands.slash_command(
        name='makerole',
        description='創建新身分組.',
        options=[
            Option(
                'name',
                '為身分組命名.',
                OptionType.string,
                required=True,
            ),
            Option(
                'color',
                '為身分組指定顏色。',
                OptionType.string,
                required=False,
            ),
        ],
        dm_permission=False,
    )
    @commands.has_role(LockRoles.admin)
    async def _makerole(
        self, inter: disnake.CommandInteraction, name: str, color: str = '#000000'
    ) -> None:
        color = get_color(color)
        await inter.guild.create_role(name=name, color=color)
        embed = disnake.Embed(description=f'身分組`{name}`已被創建.', color=color)
        await inter.send(embed=embed)

    # assignrole
    @commands.slash_command(
        name='assignrole',
        description='為成員分配身分組。',
        options=[
            Option('member', 'Mention the server member.', OptionType.user, required=True),
            Option(
                'role',
                '分配給用戶的身分組.',
                OptionType.role,
                required=True,
            ),
        ],
        dm_permission=False,
    )
    @commands.has_role(LockRoles.admin)
    async def _assignrole(
        self,
        inter: disnake.CommandInteraction,
        member: disnake.Member,
        role: disnake.Role,
    ) -> None:
        await member.add_roles(role)
        await inter.send(f'身分組 {role.mention} 已分配給**{member.display_name}**!')

    # removerole
    @commands.slash_command(
        name='removerole',
        description='從服務器中刪除身份組.',
        options=[Option('role', '提及要刪除的身份組.', OptionType.role, required=True)],
        dm_permission=False,
    )
    @commands.has_role(LockRoles.admin)
    async def _removerole(self, inter: disnake.CommandInteraction, role: disnake.Role) -> None:
        await role.delete()
        embed = core.TypicalEmbed(inter).set_title(f'身份組 **@{role.name}** 已被移除!')
        await inter.send(embed=embed)

    # makeinvite
    @commands.slash_command(
        name='makeinvite',
        description='創建服務器的邀請鏈接.',
        options=[
            Option(
                'max_age',
                '以秒為單位指定邀請的有效期。默認為無限制。',
                OptionType.integer,
                min_value=0,
            ),
            Option(
                'max_uses',
                '指定邀請的最大使用限制。默認為 1 個用戶.',
                OptionType.integer,
                min_value=1,
            ),
            Option('reason', '給出創建邀請的理由.', OptionType.string),
        ],
        dm_permission=False,
    )
    @commands.has_any_role(LockRoles.mod, LockRoles.admin)
    async def _makeinvite(
        self,
        inter: disnake.CommandInteraction,
        max_age: int = 0,
        max_uses: int = 1,
        reason: str = 'No reason provided.',
    ) -> None:
        invite = await inter.channel.create_invite(
            max_age=max_age, max_uses=max_uses, reason=reason
        )

        embed = (
            core.TypicalEmbed(inter)
            .set_title(value='Created a new invite!')
            .add_field(name='Link', value=f'https://discord.gg/{invite.code}')
            .add_field(name='Code', value=f'`{invite.code}`')
            .add_field(
                name='Lifetime',
                value='Unlimited' if max_age == 0 else f'{max_age} Seconds',
            )
        )

        await inter.send(embed=embed)

    # nick
    @commands.slash_command(
        name='nick',
        description='更改成員暱稱.',
        options=[
            Option('member', '提及服務器成員.', OptionType.user, required=True),
            Option(
                'nickname',
                '給提到的用戶設置暱稱。',
                OptionType.string,
                required=True,
            ),
        ],
        dm_permission=False,
    )
    @commands.has_any_role(LockRoles.mod, LockRoles.admin)
    async def _nick(
        self, inter: disnake.CommandInteraction, member: disnake.Member, nickname: str
    ) -> None:
        await member.edit(nick=nickname)
        await inter.send(f'成員 {member.mention} 的暱稱已被更改為 **{nickname}**!')

    # makechannel
    @commands.slash_command(
        name='makechannel',
        description='創建一個新的文字頻道.',
        options=[
            Option(
                'name',
                '為新頻道命名。',
                OptionType.string,
                required=True,
            ),
            Option(
                'category',
                '指定要將頻道放入的類別.',
                OptionType.channel,
                channel_types=[ChannelType.category],
            ),
            Option('topic', '為新頻道提供一個主題。', OptionType.string),
        ],
        dm_permission=False,
    )
    @commands.has_role(LockRoles.admin)
    async def _makechannel(
        self,
        inter: disnake.CommandInteraction,
        name: str,
        category: disnake.CategoryChannel | None = None,
        topic: str | None = None,
    ) -> None:
        channel = await inter.guild.create_text_channel(name=name, topic=topic, category=category)
        embed = core.TypicalEmbed(inter).set_title(f'頻道 {channel.mention} 已被創建!')
        await inter.send(embed=embed)

    # makevc
    @commands.slash_command(
        name='makevc',
        description='創建一個新的語音頻道.',
        options=[
            Option('name', '給語音頻道起個名字.', required=True),
            Option(
                'category',
                '指定要將頻道放入的類別.',
                OptionType.channel,
                channel_types=[ChannelType.category],
            ),
        ],
        dm_permission=False,
    )
    @commands.has_role(LockRoles.admin)
    async def _makevc(
        self,
        inter: disnake.CommandInteraction,
        name: str,
        category: disnake.CategoryChannel | None = None,
    ) -> None:
        vc = await inter.guild.create_voice_channel(name=name, category=category)
        embed = core.TypicalEmbed(inter).set_title(f'VC {vc.mention} 已被創建!')
        await inter.send(embed=embed)

    # makecategory
    @commands.slash_command(
        name='makecategory',
        description='創建新的頻道類別.',
        options=[
            Option(
                'name',
                '為新類別命名.',
                OptionType.string,
                required=True,
            )
        ],
        dm_permission=False,
    )
    @commands.has_role(LockRoles.admin)
    async def _makecategory(
        self,
        inter: disnake.CommandInteraction,
        name: str,
    ) -> None:
        category = await inter.guild.create_category(name=name)
        embed = core.TypicalEmbed(inter).set_title(f'類別 {category.mention} 已被創建!')
        await inter.send(embed=embed)

    # removechannel
    @commands.slash_command(
        name='removechannel',
        description='從服務器中刪除頻道.',
        options=[
            Option(
                'channel',
                '指定要刪除的頻道.',
                OptionType.channel,
                required=True,
            )
        ],
        dm_permission=False,
    )
    @commands.has_role(LockRoles.admin)
    async def _removechannel(
        self,
        inter: disnake.CommandInteraction,
        channel: disnake.TextChannel | disnake.VoiceChannel | disnake.StageChannel,
    ) -> None:
        await channel.delete()
        embed = core.TypicalEmbed(inter).set_title('頻道已被刪除!')
        await inter.send(embed=embed)

    # reset
    @commands.slash_command(
        name='reset', description='Resets the current channel.', dm_permission=False
    )
    @commands.has_role(LockRoles.admin)
    async def _reset(self, inter: disnake.CommandInteraction) -> None:
        name = inter.channel.name
        category = inter.channel.category
        topic = inter.channel.topic
        overwrites = inter.channel.overwrites

        resetted = await inter.guild.create_text_channel(
            name=name, topic=topic, category=category, overwrites=overwrites
        )
        await inter.channel.delete()
        await resetted.send(f'頻道被重置 {inter.author.mention}.')

    # afkvc
    @commands.slash_command(
        name='afkvc',
        description='為服務器配置AFK頻道.',
        options=[
            Option(
                'channel',
                '選擇afk頻道。留空以創建新的。',
                OptionType.channel,
                channel_types=[ChannelType.voice],
            ),
            Option(
                'timeout',
                '用戶設置AFK後的時間.默認為 5 分鐘.',
                OptionType.integer,
                min_value=60,
                max_value=3600,
                choices=[
                    OptionChoice('1m', 60),
                    OptionChoice('5m', 300),
                    OptionChoice('15m', 900),
                    OptionChoice('30m', 1800),
                    OptionChoice('1h', 3600),
                ],
            ),
        ],
        dm_permission=False,
    )
    @commands.has_role(LockRoles.admin)
    async def _afkvc(
        self,
        inter: disnake.CommandInteraction,
        channel: disnake.VoiceChannel | None = None,
        timeout: int = 300,
    ) -> None:
        if channel is None:
            channel = await inter.guild.create_voice_channel(name='afk-vc')

        await inter.guild.edit(
            reason=f'非活動頻道更新者: {inter.author}',
            afk_channel=channel,
            afk_timeout=timeout,
        )
        await inter.send(f'{channel.mention} 已設置為AFK頻道，超時時間為 `{timeout}s`.')


# The setup() function for the cog.
def setup(bot: core.IgKnite) -> None:
    bot.add_cog(Customization(bot))
