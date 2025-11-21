# Guizhong Web Interface

This is the web interface for the Guizhong Discord Bot, allowing users to view AI conversations with full Markdown and LaTeX support.

## Setup

1.  **Install Dependencies**:
    ```bash
    pnpm install
    ```

2.  **Environment Variables**:
    Create a `.env.local` file in this directory with your MongoDB connection string:
    ```env
    MONGODB_URI=mongodb://your-mongodb-uri
    ```
    (You can copy this from your bot's `config.yml`)

3.  **Run Development Server**:
    ```bash
    pnpm dev
    ```

4.  **Build for Production**:
    ```bash
    pnpm build
    pnpm start
    ```

## Integration

The bot is configured to link to this website. Ensure the `webUrl` in the bot's `config.yml` matches the URL where this website is hosted (e.g., `http://localhost:3000` or your production domain).
