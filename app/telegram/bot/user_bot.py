import logging
import requests
from telegram import Update
from telegram.ext import (
    ApplicationBuilder, ContextTypes, CommandHandler,
    ConversationHandler, MessageHandler, filters, 
    PreCheckoutQueryHandler, CallbackQueryHandler,
)
import os
from dotenv import load_dotenv

from bot_utils import (wallet_options, event_options, 
                       send_default_message)

from bot_onboarding import new_user_menu, existing_user_menu
from bot_onboarding import create_profile, get_new_user_name, register_new_user

from bot_wallet_options import (view_wallet_balance,view_transaction_history, 
                                top_up_wallet, proceed_payment, 
                                precheckout, successful_payment)

from bot_event_options import (redeem, show_QR,view_events, check_registration, 
                               validate_registration, process_registration)

load_dotenv()
# Environment variables
TELE_TOKEN_TEST = os.getenv("TELE_TOKEN_TEST")
PROVIDER_TOKEN = os.getenv("PROVIDER_TOKEN")
endpoint_url = os.getenv("BACKEND_ENDPOINT", "http://localhost:3000")
webhook_url = os.getenv("WEBHOOK_URL")
PORT = int(os.environ.get('PORT', 5000))

# Logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# States
ROUTE, NEW_USER, NEW_USER_NAME, SHOW_QR = range(4)

"""
=============================================================================================
is_new_user: check whether a user is a new user
start: Send bot description and provide user with wallet & event options, 
cancel: Exit current action
unknown: User sends an unknown commad/message/invalid response
error_handler: Error occured during execution and user is informed
=============================================================================================
"""

async def is_new_user(user_id):
    response = requests.get(endpoint_url + f"/getUserInfo/{user_id}")
    response_data = response.json()
    if response_data['name'] == "No Such User Exists":
        return True
    else:
        return False


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    context.user_data["new_user"] = await is_new_user(user_id)
    if context.user_data["new_user"] == True:
        await new_user_menu(update, context)
    else:
        await existing_user_menu(update, context)
    return ROUTE


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await context.bot.send_message(
        chat_id=update.effective_chat.id, 
        text="Thank you for visiting the Mynt Ticketing Bot"
    )
    return ConversationHandler.END


async def unknown(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await send_default_message(
        update, 
        context, 
        "Sorry, I didn't understand that command. \n"
        "Use /start to head back to the main menu"
    )
    return ConversationHandler.END


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.error(msg="Exception while handling an update:", exc_info=context.error)
    return ConversationHandler.END


if __name__ == '__main__':
    application = ApplicationBuilder().token(TELE_TOKEN_TEST).build()

    conversation_handler = ConversationHandler(
        entry_points=[
            CommandHandler('start', start),
            CommandHandler('cancel', cancel),
        ],
        states={
            ROUTE: {
                CallbackQueryHandler(start, pattern="^start$"),
                CallbackQueryHandler(wallet_options, pattern="^wallet_options$"),
                CallbackQueryHandler(view_wallet_balance,pattern="^view_wallet_balance$"),
                CallbackQueryHandler(view_transaction_history, pattern="^view_transaction_history_(.*)$"),
                CallbackQueryHandler(top_up_wallet, pattern="^top_up_wallet$"),
                CallbackQueryHandler(create_profile, pattern="^create_profile$"),
                CallbackQueryHandler(proceed_payment, pattern="^top_up_10$"),
                CallbackQueryHandler(proceed_payment, pattern="^top_up_50$"),
                CallbackQueryHandler(proceed_payment, pattern="^top_up_100$"),
                CallbackQueryHandler(event_options, pattern="^event_options$"),
                CallbackQueryHandler(view_events, pattern="^view_events$"),
                CallbackQueryHandler(check_registration, pattern="^check_registration$"),
                CallbackQueryHandler(validate_registration, pattern="^title_(.*)$"), ## Can handle any callback pattern,
                CallbackQueryHandler(process_registration, pattern="^process_registration$"),
                CallbackQueryHandler(redeem, pattern="^redeem$"),
                CallbackQueryHandler(show_QR, pattern="^show_QR_(.*)$"),
                CommandHandler('start', start),
                CommandHandler('cancel', cancel),
            },
            NEW_USER: [MessageHandler(filters.TEXT, register_new_user),
                       CallbackQueryHandler(start, pattern="^start$")],
            NEW_USER_NAME: [
                MessageHandler(filters.TEXT, get_new_user_name),
                CallbackQueryHandler(start, pattern="^start$")
                ],
            SHOW_QR: [MessageHandler(filters.TEXT, show_QR)],
        },
        fallbacks=[MessageHandler(filters.TEXT, unknown)]
    )
    application.add_handler(conversation_handler)

    application.add_handler(PreCheckoutQueryHandler(precheckout)) # Payment Services
    application.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, successful_payment)) # Payment Services
    application.add_handler(MessageHandler(filters.TEXT, unknown)) # Unknown messages
    application.add_error_handler(error_handler) # Error handling

    if os.getenv("WEBHOOK_URL"):
        application.run_webhook(listen="0.0.0.0",
                            port=int(PORT),
                            url_path=TELE_TOKEN_TEST,
                            webhook_url=os.getenv("WEBHOOK_URL") + TELE_TOKEN_TEST)
        logger.info("Application running via webhook: ", TELE_TOKEN_TEST)
        
    else:
        application.run_polling()
        logger.info("Application running via polling")