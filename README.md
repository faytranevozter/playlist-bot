# Playlist Bot for YouTube Music

## Overview

This application allows you to control a playlist of songs on YouTube Music using Puppeteer and a Telegram bot. With this setup, you can easily manage and enjoy your favorite music without having to manually interact with YouTube Music.

## Features

| Feature                 | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| Search Music            | Search for a specific song to add to the playlist.           |
| Add to Queue            | Add a song to the end of the playlist.                       |
| Add to Play Next        | Add a song to play next in the playlist.                     |
| Play                    | Start playing the playlist.                                  |
| Pause                   | Pause the currently playing song.                            |
| Info Current Playing    | Get information about the currently playing song.            |
| Next                    | Skip to the next song in the playlist.                       |
| Get Lyrics              | Retrieve the lyrics of the currently playing song.           |
| Vote for Next           | Allow users to vote for the next song in the playlist.       |
| Subscribe & Unsubscribe | Allow users to subscribe and unsubscribe from notifications. |

## Under Development Features

| Feature        | Description                                 |
| -------------- | ------------------------------------------- |
| Setting Volume | Adjust the volume of the music playback.    |
| Shuffle        | Shuffle the order of songs in the playlist. |

## Prerequisites

Before running the application, ensure you have the following:

- Node.js installed on your machine
- Telegram bot token (create a bot on Telegram and obtain the token)
  - Important: Make sure your Telegram bot has the following settings enabled:
    - [Inline Mode](https://core.telegram.org/bots/api#inline-mode): Enable inline mode for the bot to process inline queries.
    - [Inline Feedback](https://core.telegram.org/bots/inline#collecting-feedback): Allow users to provide feedback directly from inline results.
- Google Chrome or Chromium browser installed (for Puppeteer)
- Database: Currently configured with SQLite. You can change the database configuration in the `prisma/schema.prisma` and `.env` file.

## Installation

Clone the repository:

```bash
git clone https://github.com/faytranevozter/playlist-bot.git
```

Install dependencies:

```bash
cd your-repository
pnpm install # or npm install
```

Create a .env file in the project root and add the following:

```env
DATABASE_URL=your_database_url
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

Run database migration:

```bash
pnpm migrate # or npm run migrate
```

Build the application:

```bash
pnpm build # or npm run build
```

Run the application:

```bash
pnpm start # or npm start
```

Usage

1. Start a chat with your Telegram bot.
1. Use the provided commands to control the playlist as described in the features section.
1. To search music just mention the bot and keyword `@playlistbot justin beiber`
1. Sit back, relax, and enjoy the music!

## Contributing

Feel free to contribute to the project by opening issues or submitting pull requests. Any improvements or bug fixes are highly appreciated.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Thanks to the creators of [Puppeteer](https://pptr.dev/), [Telegraf](https://github.com/telegraf/telegraf), and [Prisma](https://www.prisma.io/) for their amazing tools.

## Contact

For any questions or support, you can reach out to [mfahrurrifai@gmail.com].
