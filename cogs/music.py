'''
The `Music` cog for IgKnite.
---

License can be found here:
https://github.com/IgKniteDev/IgKnite/blob/main/LICENSE
'''


# Imports.
import asyncio
import functools
import itertools
import random
from typing import Any, Self, Tuple

import disnake
import spotipy
import yt_dlp
from async_timeout import timeout
from disnake import ChannelType, Option, OptionType
from disnake.ext import commands
from spotipy.oauth2 import SpotifyClientCredentials

import core
from core.chain import keychain

# Bug reports message.
yt_dlp.utils.bug_reports_message = lambda: ''

# Creating a spotipy.Spotify instance.
spotify = spotipy.Spotify(
    auth_manager=SpotifyClientCredentials(
        client_id=keychain.spotify_client_id, client_secret=keychain.spotify_client_secret
    )
)


# Custom exceptions for music commands.
class VoiceError(Exception):
    pass


class YTDLError(Exception):
    pass


# YTDLSource class for handling sources.
class YTDLSource(disnake.PCMVolumeTransformer):
    YTDL_OPTIONS = {
        'format': 'bestaudio/best',
        'extractaudio': True,
        'audioformat': 'mp3',
        'outtmpl': '%(extractor)s-%(id)s-%(title)s.%(ext)s',
        'restrictfilenames': True,
        'noplaylist': True,
        'nocheckcertificate': True,
        'ignoreerrors': False,
        'logtostderr': False,
        'quiet': True,
        'no_warnings': True,
        'default_search': 'auto',
        'source_address': '0.0.0.0',
    }

    FFMPEG_OPTIONS = {
        'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
        'options': '-vn',
    }

    ytdl = yt_dlp.YoutubeDL(YTDL_OPTIONS)
    ytdl.cache.remove()

    def __init__(
        self,
        inter: disnake.CommandInteraction,
        source: disnake.FFmpegPCMAudio,
        *,
        data: dict,
        volume: float = 0.5,
    ) -> None:
        super().__init__(source, volume)

        self.requester = inter.author
        self.channel = inter.channel
        self.data = data

        self.uploader = data.get('uploader')
        self.uploader_url = data.get('uploader_url')

        date = data.get('upload_date')
        self.upload_date = date[6:8] + '.' + date[4:6] + '.' + date[0:4]

        self.title = data.get('title')
        self.thumbnail = data.get('thumbnail')
        self.description = data.get('description')
        self.duration = self.parse_duration(int(data.get('duration')))
        self.tags = data.get('tags')
        self.url = data.get('webpage_url')
        self.views = data.get('view_count')
        self.likes = data.get('like_count')
        self.dislikes = data.get('dislike_count')
        self.stream_url = data.get('url')

    def __str__(self):
        return '**{0.title}** by **[{0.uploader}]({0.uploader_url})**'.format(self)

    @classmethod
    async def create_source(
        cls,
        inter: disnake.CommandInteraction,
        search: str,
        *,
        loop: asyncio.BaseEventLoop,
    ) -> Self:
        loop = loop or asyncio.get_event_loop()

        partial = functools.partial(cls.ytdl.extract_info, search, download=False, process=False)
        data = await loop.run_in_executor(None, partial)

        if data is None:
            raise YTDLError(f'無法找到任何匹配 **{search}**的內容。')

        if 'entries' not in data:
            process_info = data

        else:
            process_info = None
            for entry in data['entries']:
                if entry:
                    process_info = entry
                    break

            if process_info is None:
                raise YTDLError(f'無法找到匹配 **{search}**的任何內容.')

        webpage_url = process_info['webpage_url']
        partial = functools.partial(cls.ytdl.extract_info, webpage_url, download=False)
        processed_info = await loop.run_in_executor(None, partial)

        if processed_info is None:
            raise YTDLError(f'Couldn\'t fetch **{webpage_url}**')

        if 'entries' not in processed_info:
            info = processed_info
        else:
            info = None

            while info is None:
                try:
                    info = processed_info['entries'].pop(0)
                except IndexError:
                    raise YTDLError(f'無法檢索 {webpage_url} 的任何匹配項.')

        return cls(inter, disnake.FFmpegPCMAudio(info['url'], **cls.FFMPEG_OPTIONS), data=info)

    @staticmethod
    def parse_duration(duration: int) -> str:
        minutes, seconds = divmod(duration, 60)
        hours, minutes = divmod(minutes, 60)
        days, hours = divmod(hours, 24)

        duration = []
        if days > 0:
            duration.append(f'{days} days')
        if hours > 0:
            duration.append(f'{hours} hours')
        if minutes > 0:
            duration.append(f'{minutes} minutes')
        if seconds > 0:
            duration.append(f'{seconds} seconds')

        return ', '.join(duration)


# Base class for interacting with the Spotify API.
class Spotify:
    @staticmethod
    def get_track_id(track: Any):
        track = spotify.track(track)
        return track['id']

    @staticmethod
    def get_playlist_track_ids(playlist_id: Any):
        ids = []
        playlist = spotify.playlist(playlist_id)

        for item in playlist['tracks']['items']:
            track = item['track']
            ids.append(track['id'])

        return ids

    @staticmethod
    def get_album(album_id: Any):
        album = spotify.album_tracks(album_id)
        return [item['id'] for item in album['items']]

    @staticmethod
    def get_album_id(id: Any):
        return spotify.album(id)

    @staticmethod
    def get_track_features(id: Any) -> str:
        meta = spotify.track(id)
        name = meta['name']
        album = meta['album']['name']
        artist = meta['album']['artists'][0]['name']
        return f'{artist} - {name} ({album})'


# View for the `now` command.
class NowCommandView(disnake.ui.View):
    def __init__(self, inter: disnake.CommandInteraction, url: str, timeout: float = 60) -> None:
        super().__init__(timeout=timeout)

        self.inter = inter
        self.add_item(disnake.ui.Button(label='Redirect', url=url))
        self.add_item(
            disnake.ui.Button(label=f'Volume: {int(inter.voice_state.volume*100)}', disabled=True)
        )

    @disnake.ui.button(label='Toggle Loop', style=disnake.ButtonStyle.gray)
    async def _loop(self, button: disnake.ui.Button, inter: disnake.Interaction) -> None:
        self.inter.voice_state.loop = not self.inter.voice_state.loop

        if not self.inter.voice_state.loop:
            button.label = 'Loop Disabled'
            button.style = disnake.ButtonStyle.red
        else:
            button.label = 'Loop Enabled'
            button.style = disnake.ButtonStyle.green

        await inter.response.edit_message(view=self)

    @disnake.ui.button(label='Skip', style=disnake.ButtonStyle.gray)
    async def _skip(self, button: disnake.ui.Button, inter: disnake.Interaction) -> None:
        self.inter.voice_state.skip()
        button.disabled = True
        button.label = 'Skipped'

        await inter.response.edit_message(view=self)

    async def on_timeout(self) -> None:
        for children in self.children:
            if 'Redirect' != children.label:
                children.disabled = True

        await self.inter.edit_original_message(view=self)


# Selection menu for the `queue` command.
class QueueCommandSelect(disnake.ui.Select):
    def __init__(self, songs, inter: disnake.CommandInteraction) -> None:
        self.songs = songs
        self.inter = inter

        options = self.options_from_songs(self.songs)

        super().__init__(
            placeholder='Choose your song.',
            options=options,
        )

    def options_from_songs(self, songs) -> list:
        options = [
            disnake.SelectOption(value=i, label=song.source.title) for i, song in enumerate(songs)
        ]
        return options

    def update_songs(self, songs) -> None:
        self.songs = songs
        self.options = self.options_from_songs(songs)

    async def callback(self, inter: disnake.MessageInteraction) -> None:
        song_index = int(self.values[0])
        song = self.songs[song_index]
        embed, _ = song.create_embed(self.inter)

        play_button = disnake.ui.Button(label='Play', style=disnake.ButtonStyle.success)

        async def play(inter: disnake.Interaction) -> None:
            await self.inter.voice_state.play_song(song_index)
            self.view.remove_item(play_button)

            await inter.response.edit_message(
                content='Force-playing selected song.', embed=None, view=None
            )

        play_button.callback = play
        self.view.add_item(play_button)

        remove_button = disnake.ui.Button(label='Remove Song', style=disnake.ButtonStyle.danger)

        async def remove(inter: disnake.Interaction) -> None:
            self.songs.remove(song_index)
            self.view.remove_item(remove_button)

            await inter.response.edit_message(
                content='Removed song from queue.', embed=None, view=None
            )

        remove_button.callback = remove
        self.view.add_item(remove_button)

        await inter.response.edit_message(embed=embed, view=self.view)


# View for the `queue` command.
class QueueCommandView(disnake.ui.View):
    def __init__(self, inter: disnake.CommandInteraction, timeout: float = 60) -> None:
        super().__init__(timeout=timeout)
        self.inter = inter

        self.select = QueueCommandSelect(self.inter.voice_state.songs, self.inter)
        self.add_item(self.select)

    @disnake.ui.button(label='Clear Queue', style=disnake.ButtonStyle.danger)
    async def clear(self, _: disnake.ui.Button, inter: disnake.Interaction) -> None:
        self.inter.voice_state.songs.clear()

        await inter.response.edit_message(content='Queue cleared!', embed=None, view=None)

    @disnake.ui.button(label='Shuffle', style=disnake.ButtonStyle.gray)
    async def shuffle(self, button: disnake.ui.Button, inter: disnake.Interaction) -> None:
        self.inter.voice_state.songs.shuffle()
        self.select.update_songs(self.inter.voice_state.songs)

        button.style = random.choice(
            [
                disnake.ButtonStyle.blurple,
                disnake.ButtonStyle.gray,
                disnake.ButtonStyle.green,
            ]
        )
        await inter.response.edit_message(view=self)

    async def on_timeout(self) -> None:
        for child in self.children:
            child.disabled = True

        await self.inter.edit_original_message(view=self)


# The Song class which represents the instance of a song.
class Song:
    __slots__ = ('source', 'requester')

    def __init__(self, source: YTDLSource) -> None:
        self.source = source
        self.requester = source.requester

    def create_embed(
        self, inter: disnake.CommandInteraction
    ) -> Tuple[core.TypicalEmbed, disnake.ui.View]:
        duration = self.source.duration or 'Live'

        embed = (
            core.TypicalEmbed(inter)
            .set_title(value=self.source.title)
            .add_field(name='Duration', value=duration)
            .add_field(name='Requester', value=self.requester.mention)
            .set_image(url=self.source.thumbnail)
        )
        view = NowCommandView(inter=inter, url=self.source.url)

        return embed, view


# The SongQueue class, which represents the queue of songs for a particular Discord server.
class SongQueue(asyncio.Queue):
    def __getitem__(self, item: Any) -> Any | list:
        if isinstance(item, slice):
            return list(itertools.islice(self._queue, item.start, item.stop, item.step))
        else:
            return self._queue[item]

    def __iter__(self) -> Any:
        return self._queue.__iter__()

    def __len__(self) -> int:
        return self.qsize()

    def clear(self) -> None:
        self._queue.clear()

    def shuffle(self) -> None:
        random.shuffle(self._queue)

    def remove(self, index: int) -> None:
        del self._queue[index]


# The VoiceState class, which represents the playback status of songs.
class VoiceState:
    def __init__(self, bot: core.IgKnite, inter: disnake.CommandInteraction) -> None:
        self.bot = bot
        self._inter = inter

        self.current = None
        self.voice = None
        self.exists = True
        self.next = asyncio.Event()
        self.songs = SongQueue()

        self._loop = False
        self._volume = 0.5
        self.skip_votes = set()

        self.audio_player = bot.loop.create_task(self.audio_player_task())

    def __del__(self) -> None:
        self.audio_player.cancel()

    @property
    def loop(self) -> bool:
        return self._loop

    @loop.setter
    def loop(self, value: bool) -> None:
        self._loop = value

    @property
    def volume(self) -> float:
        return self._volume

    @volume.setter
    def volume(self, value: float) -> None:
        self._volume = value

    @property
    def is_playing(self) -> Any:
        return self.voice and self.voice.is_playing()

    async def audio_player_task(self) -> None:
        while True:
            self.next.clear()
            self.now = None

            if not self.loop:
                try:
                    async with timeout(180):
                        self.current = await self.songs.get()

                except asyncio.TimeoutError:
                    self.bot.loop.create_task(self.stop())
                    self.exists = False
                    return

                self.current.source.volume = self._volume
                self.voice.play(self.current.source, after=self.play_next_song)

            elif self.loop:
                self.now = disnake.FFmpegPCMAudio(
                    self.current.source.stream_url, **YTDLSource.FFMPEG_OPTIONS
                )
                self.voice.play(self.now, after=self.play_next_song)

            await self.next.wait()

    async def play_song(self, song_index) -> None:
        removed_songs = []
        songs = self.songs
        songs = list(songs)
        for idx, song in enumerate(songs):
            if idx != song_index:
                removed_songs.append(await self.songs.get())
            else:
                break

        for removed in removed_songs:
            await self.songs.put(removed)

        self.skip()

    def play_next_song(self, error=None) -> None:
        if error:
            raise VoiceError(str(error))

        self.next.set()

    def skip(self) -> None:
        self.skip_votes.clear()

        if self.is_playing:
            self.voice.stop()

    async def stop(self) -> None:
        self.songs.clear()

        if self.voice:
            await self.voice.disconnect()
            self.voice = None


# The actual cog.
class Music(commands.Cog):
    def __init__(self, bot: core.IgKnite) -> None:
        self.bot = bot
        self.voice_states = {}

    def cog_unload(self) -> None:
        for state in self.voice_states.values():
            self.bot.loop.create_task(state.stop())

    def get_voice_state(self, inter: disnake.CommandInteraction) -> VoiceState:
        '''
        A method that returns the `VoiceState` instance for a specific guild.
        '''

        state = self.voice_states.get(inter.guild.id)

        if not state or not state.exists:
            state = VoiceState(self.bot, inter)
            self.voice_states[inter.guild.id] = state

        return state

    async def cog_before_slash_command_invoke(self, inter: disnake.CommandInteraction) -> None:
        inter.voice_state = self.get_voice_state(inter)
        return await inter.response.defer()

    async def cog_before_message_command_invoke(self, inter: disnake.CommandInteraction) -> None:
        inter.voice_state = self.get_voice_state(inter)
        return await inter.response.defer()

    async def cog_before_user_command_invoke(self, inter: disnake.CommandInteraction) -> None:
        inter.voice_state = self.get_voice_state(inter)
        return await inter.response.defer()

    async def _join_logic(
        self,
        inter: disnake.CommandInteraction,
        channel: disnake.VoiceChannel | disnake.StageChannel | None = None,
    ) -> Any:
        '''
        A sub-method for commands requiring the bot to join a voice / stage channel.
        '''

        destination = channel or (inter.author.voice and inter.author.voice.channel)
        try:
            if inter.voice_state.voice:
                await inter.voice_state.voice.move_to(destination)
            else:
                inter.voice_state.voice = await destination.connect()

            return destination

        except AttributeError:
            await inter.send('請切換到語音或舞台頻道以使用此命令.', ephemeral=True)

    # join
    @commands.slash_command(
        name='join',
        description='加入你所在的語音頻道. ' + '您還可以指定加入哪個頻道.',
        options=[
            Option(
                'channel',
                '指定要加入的頻道.',
                OptionType.channel,
                channel_types=[ChannelType.voice, ChannelType.stage_voice],
            )
        ],
        dm_permission=False,
    )
    async def _join(
        self,
        inter: disnake.CommandInteraction,
        *,
        channel: disnake.VoiceChannel | disnake.StageChannel | None = None,
    ) -> None:
        destination = await self._join_logic(inter, channel)
        if destination is not channel:
            embed = core.TypicalEmbed(inter).set_title(f'✅已加入 **{destination}.**')
            return await inter.send(embed=embed)
        else:
            embed = core.TypicalEmbed(inter).set_title(f'✅被傳送到 **{destination}.**')
            return await inter.send(embed=embed)

    # leave
    @commands.slash_command(
        name='leave',
        description='清空歌單，離開語音通道.',
        dm_permission=False,
    )
    async def _leave(self, inter: disnake.CommandInteraction) -> None:
        if not inter.voice_state.voice:
            embed = core.TypicalEmbed(inter).set_title('❌我不在任何語音頻道內')
            return await inter.send(embed=embed)

        if not inter.author.voice:
            embed = core.TypicalEmbed(inter).set_title('❌你和我不在同一個語音頻道')
            return await inter.send(embed=embed)

        await inter.voice_state.stop()
        del self.voice_states[inter.guild.id]
        embed = core.TypicalEmbed(inter).set_title('✅已離開當前語音頻道')
        await inter.followup.send(embed=embed)

    # volume
    @commands.slash_command(
        name='volume',
        description='設置當前歌曲的音量.',
        options=[
            Option(
                'volume',
                '指定要設置的新音量。 ' + '必須在 1 到 100 之間（順便說一句，它可以更高)',
                OptionType.integer,
                min_value=1,
                max_value=200,
                required=True,
            )
        ],
        dm_permission=False,
    )
    async def _volume(self, inter: disnake.CommandInteraction, volume: float) -> None:
        if not inter.voice_state.is_playing:
            embed = core.TypicalEmbed(inter).set_title('❌目前沒有撥放任何歌曲')
            return await inter.send(embed=embed)

        inter.voice_state.current.source.volume = volume / 100
        embed = core.TypicalEmbed(inter).set_title(f'✅歌曲的音量現在設置為 **{volume}%**')
        await inter.send(embed=embed)

    # now
    @commands.slash_command(
        name='now',
        description='顯示目前撥放的歌曲.',
        dm_permission=False,
    )
    async def _now(self, inter: disnake.CommandInteraction) -> None:
        if inter.voice_state.is_playing:
            embed, view = inter.voice_state.current.create_embed(inter)
            await inter.send(embed=embed, view=view)
        else:
            embed = core.TypicalEmbed(inter).set_title('❌目前沒有撥放任何歌曲')
            await inter.send(embed=embed)

    # pause
    @commands.slash_command(
        name='pause',
        description='暫停當前播放的歌曲.',
        dm_permission=False,
    )
    async def _pause(self, inter: disnake.CommandInteraction) -> None:
        if not inter.voice_state.voice:
            embed = core.TypicalEmbed(inter).set_title('❌我沒有連接到任何語音頻道')
            return await inter.send(embed=embed)
        if not inter.author.voice:
            embed = core.TypicalEmbed(inter).set_title('❌你和我不在同一個語音頻道')
            return await inter.send(embed=embed)
        if inter.voice_state.is_playing:
            inter.voice_state.voice.pause()
            embed = core.TypicalEmbed(inter).set_title('✅已暫停撥放當前歌曲')
            await inter.send(embed=embed)

    # resume
    @commands.slash_command(
        name='resume',
        description='恢復當前暫停的歌曲.',
        dm_permission=False,
    )
    async def _resume(self, inter: disnake.CommandInteraction) -> None:
        if not inter.voice_state.voice:
            embed = core.TypicalEmbed(inter).set_title('❌我沒有連接到任何語音頻道')
            return await inter.send(embed=embed)
        if not inter.author.voice:
            embed = core.TypicalEmbed(inter).set_title('❌你和我不在同一個語音頻道')
            return await inter.send(embed=embed)
        if inter.voice_state.voice.is_paused():
            inter.voice_state.voice.resume()
            embed = core.TypicalEmbed(inter).set_title('✅已重新開始撥放')
            await inter.send(embed=embed)

    # stop
    @commands.slash_command(
        name='stop',
        description='停止播放歌曲並清空歌單.',
        dm_permission=False,
    )
    async def _stop(self, inter: disnake.CommandInteraction) -> None:
        if not inter.voice_state.voice:
            embed = core.TypicalEmbed(inter).set_title('❌我沒有連接到任何語音頻道')
            return await inter.send(embed=embed)

        if not inter.author.voice:
            embed = core.TypicalEmbed(inter).set_title('❌你和我不在同一個語音頻道')
            return await inter.send(embed=embed)

        inter.voice_state.songs.clear()

        if inter.voice_state.is_playing:
            if inter.voice_state.loop:
                inter.voice_state.loop = not inter.voice_state.loop

            inter.voice_state.voice.stop()
            embed = core.TypicalEmbed(inter).set_title('✅停止播放所有歌曲')
            await inter.send(embed=embed)

    # skip
    @commands.slash_command(
        name='skip',
        description='投票跳過一首歌。撥放者可以自動跳過.',
        dm_permission=False,
    )
    async def _skip(self, inter: disnake.CommandInteraction) -> None:
        if not inter.voice_state.is_playing:
            embed = core.TypicalEmbed(inter).set_title('❌沒有任何歌曲撥放中')
            return await inter.send(embed=embed)

        if inter.voice_state.loop:
            inter.voice_state.loop = not inter.voice_state.loop

        voter = inter.author

        if voter == inter.voice_state.current.requester:
            embed = core.TypicalEmbed(inter).set_title('✅跳過目前歌曲')
            await inter.send(embed=embed)
            inter.voice_state.skip()

        elif voter.id not in inter.voice_state.skip_votes:
            inter.voice_state.skip_votes.add(voter.id)
            total_votes = len(inter.voice_state.skip_votes)

            if total_votes >= 3:
                embed = core.TypicalEmbed(inter).set_title('✅跳過目前歌曲')
                await inter.send(embed=embed)
                inter.voice_state.skip()
            else:
                embed = core.TypicalEmbed(inter).set_title(f'✅跳過投票已添加，目前有 **{total_votes}/3** 票')
                await inter.send(embed=embed)

        else:
            embed = core.TypicalEmbed(inter).set_title('✅你們已經投票跳過了目前歌曲')
            await inter.send(embed=embed)

    # queue
    @commands.slash_command(name='queue', description='顯示目前歌單.', dm_permission=False)
    async def _queue(self, inter: disnake.CommandInteraction) -> None:
        if len(inter.voice_state.songs) == 0:
            embed = core.TypicalEmbed(inter).set_title('❌歌單是空的')
            return await inter.send(embed=embed)

        view = QueueCommandView(inter=inter)
        await inter.send(view=view)

    # rmqueue
    @commands.slash_command(
        name='rmqueue',
        description='移除特定序號之歌曲.',
        options=[
            Option(
                'index',
                '指定要刪除的歌曲.',
                OptionType.integer,
                required=True,
            )
        ],
        dm_permission=False,
    )
    async def _rmqueue(self, inter: disnake.CommandInteraction, index: int):
        if not inter.voice_state.voice:
            embed = core.TypicalEmbed(inter).set_title('❌我沒有連接到任何語音頻道')
            return await inter.send(embed=embed)

        if not inter.author.voice:
            embed = core.TypicalEmbed(inter).set_title('❌你和我不在同一個語音頻道')
            return await inter.send(embed=embed)

        if len(inter.voice_state.songs) == 0:
            embed = core.TypicalEmbed(inter).set_title('❌歌單是空的，所以沒有什麼可以刪除的')
            return await inter.send(embed=embed)

        inter.voice_state.songs.remove(index - 1)
        embed = core.TypicalEmbed(inter).set_title('✅從歌單中刪除項目')
        await inter.send(embed=embed)

    # shuffle
    @commands.slash_command(name='shuffle', description='將目前歌單順序打亂.', dm_permission=False)
    async def _shuffle(self, inter: disnake.CommandInteraction) -> None:
        inter.voice_state.songs.shuffle()
        embed = core.TypicalEmbed(inter).set_title('🔀已打亂目前歌單')
        await inter.send(embed=embed)

    # loop
    @commands.slash_command(name='loop', description='切換循環撥放模式.', dm_permission=False)
    async def _loop(self, inter: disnake.CommandInteraction) -> None:
        inter.voice_state.loop = not inter.voice_state.loop
        if inter.voice_state.loop:
            embed = core.TypicalEmbed(inter).set_title('🔁開啟循環模式')
        else:
            embed = core.TypicalEmbed(inter).set_title('▶️關閉循環模式')
        await inter.send(embed=embed)

    # Backend for play-labelled commands.
    # Do not use it within other commands unless really necessary.
    async def _play_backend(
        self, inter: disnake.CommandInteraction, keyword: str, send_embed: bool = True
    ) -> None:
        if not inter.voice_state.voice:
            await self._join_logic(inter)

        try:
            source = await YTDLSource.create_source(inter, keyword, loop=self.bot.loop)

        except Exception as e:
            if isinstance(e, YTDLError):
                await inter.send(
                    f'處理此請求時發生錯誤：{str(e)}',
                    ephemeral=True,
                )
            else:
                pass

        else:
            song = Song(source)
            await inter.voice_state.songs.put(song)

            if send_embed:
                embed = core.TypicalEmbed(inter).set_title('▶️添加播放清單')
                embed = embed.set_description(value=f'{song.source.title}')

                view = core.SmallView(inter).add_button(label='連結', url=song.source.url)
                await inter.send(embed=embed, view=view)

    # play (slash)
    @commands.slash_command(
        name='play',
        description='播放你所提菇的歌曲.',
        options=[
            Option(
                'keyword',
                '請輸入要搜索的關鍵字。支持 YouTube、Spotify 和 bilibili 鏈接。(b站須等待數秒)',
                OptionType.string,
                required=True,
            )
        ],
        dm_permission=False,
    )
    async def _play(self, inter: disnake.CommandInteraction, keyword: str) -> None:
        async def process_spotify_tracks(ids, tracks) -> None:
            for i in range(len(ids)):
                track = Spotify.get_track_features(ids[i])
                tracks.append(track)

            for track in tracks:
                await self._play_backend(inter, track, send_embed=False)

            embed = core.TypicalEmbed(inter).set_title(
                value=f'{len(tracks)} tracks have been queued!'
            )
            await inter.send(embed=embed)

        if 'https://open.spotify.com/playlist/' in keyword or 'spotify:playlist:' in keyword:
            ids = Spotify.get_playlist_track_ids(keyword)
            tracks = []

            await process_spotify_tracks(ids, tracks)

        elif 'https://open.spotify.com/album/' in keyword or 'spotify:album:' in keyword:
            ids = Spotify.get_album(keyword)
            tracks = []

            await process_spotify_tracks(ids, tracks)

        elif 'https://open.spotify.com/track/' in keyword or 'spotify:track:' in keyword:
            id = Spotify.get_track_id(keyword)
            track = Spotify.get_track_features(id)
            await self._play_backend(inter, track)

        else:
            await self._play_backend(inter, keyword)

    # play (message)
    @commands.message_command(name='Search & Play', dm_permission=False)
    async def _play_message(
        self, inter: disnake.CommandInteraction, message: disnake.Message
    ) -> None:
        await self._play_backend(inter, message.content)

    # Backend for play-labelled commands.
    # Do not use it within other commands unless really necessary.
    async def _playrich_backend(
        self, inter: disnake.CommandInteraction, member: disnake.Member | None = None
    ) -> None:
        member = member or inter.author

        for activity in member.activities:
            if isinstance(activity, disnake.Spotify):
                track = Spotify.get_track_features(activity.track_id)
                return await self._play_backend(inter, track)

        await inter.send('Nothing is being played on Spotify!')

    # playrich (slash)
    @commands.slash_command(
        name='playrich',
        description='嘗試從一個人的歌單中加入一首歌曲。',
        options=[Option('member', 'Mention the server member.', OptionType.user)],
        dm_permission=False,
    )
    async def _playrich(
        self, inter: disnake.CommandInteraction, member: disnake.Member | None = None
    ) -> None:
        await self._playrich_backend(inter, member)

    # playrich (user)
    @commands.user_command(name='Rich Play', dm_permisision=False)
    async def _playrich_user(
        self, inter: disnake.CommandInteraction, member: disnake.Member
    ) -> None:
        await self._playrich_backend(inter, member)


# The setup() function for the cog.
def setup(bot: core.IgKnite) -> None:
    bot.add_cog(Music(bot))
