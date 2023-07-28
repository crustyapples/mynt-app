# Treehoppers <> Mynt: Event Registration and NFT Ticketing made easy with Telegram

This is an NFT Ticketing Platform which simplifies Event Creation and NFT Ticket Issuance for Merchants, and Event Registration and Ticket Redemption for users through a Telegram Bot. 

### Merchant-Facing Application
![image](https://github.com/crustyapples/mynt-app/assets/24990448/9749cdd8-1ba3-49fd-97ce-e4cfd6e01c74)

![image](https://github.com/crustyapples/mynt-app/assets/24990448/989fac89-c76d-4d91-ba69-4e8f414faee9)


### User-Facing Telegram Bot
https://github.com/crustyapples/mynt-app/assets/24990448/98f95d11-75fc-4727-b9ff-0bd1eb272221

https://github.com/crustyapples/mynt-app/assets/24990448/5d8ffed6-52d4-4e8d-b9b5-fc6b681fb579



## Environment Variables
Create a `.env` file in the **root** directory with the following variables:
```bash
TELE_TEST_TOKEN: Telegram ID for the bot
PROVIDER_TOKEN: Stripe (test) provider token for accepting payments
```

Create a `.env` file in the **merchant** directory with the following variables:
```bash
NEXT_PUBLIC_TEST_TOKEN: Telegram ID for the bot
```
