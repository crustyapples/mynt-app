# Telegram Components

## Telegram Python bot
This directory contains the Python code for the Telegram bot. The source code mainly consists of the following four files:

- `bot_onboarding.py`: Contains the workflow for when a new user signs up. It includes the "create profile" button and collects user information such as name and contact.

- `bot_utils.py`: Contains frequently used code, such as sending menu options and back buttons.

- `bot_event_options.py`: Contains the workflow for events, including viewing events, registering for them, and viewing registration status.

- `bot_wallet_options.py`: Contains the code for wallet-related operations, such as topping up, viewing transaction history, and balance.

- `user_bot.py`: Main entry point containing the conversation handler and other related components.

## ExpressJS Server
This directory contains the server endpoints for all event and wallet-related operations.

- `server.js`: Contains all the endpoints that receive requests from the Telegram bot.

- `helper.js`: Contains helper functions and Firebase functions.

Please refer to the individual files for more detailed information about their functionality and implementation.