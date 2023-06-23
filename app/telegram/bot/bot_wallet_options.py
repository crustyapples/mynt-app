import logging
import requests
import datetime
from telegram import (
    Update, LabeledPrice, InlineKeyboardButton, InlineKeyboardMarkup,
)
from telegram.ext import (
    ContextTypes, ConversationHandler, CallbackContext,
)
import os
from dotenv import load_dotenv

from bot_utils import (send_default_wallet_message, update_default_wallet_message)

ROUTE, NEW_USER, NEW_USER_NAME, SHOW_QR = range(4)

load_dotenv()
endpoint_url = os.getenv("BACKEND_ENDPOINT", "http://localhost:3000")
PROVIDER_TOKEN = os.getenv("PROVIDER_TOKEN")

# Logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


""""
=============================================================================================
get_user_id_from_query: Reusable function for retrieving user id after a user has clicked a button
view_wallet_balance: Display balance of user's wallet
view_transaction_history: Display transaction history of user
=============================================================================================
"""
async def get_user_id_from_query(update):
    query = update.callback_query
    await query.answer()
    user_id = query.from_user.id
    return user_id

async def view_wallet_balance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    loading_message = "Retrieving wallet balance..."
    message = await context.bot.send_message(chat_id=update.effective_chat.id, text=loading_message)

    user_id = await get_user_id_from_query(update)
    logger.info(f"Retrieving wallet balance for User: {user_id}")
    response = requests.get(endpoint_url + f"/viewWalletBalance/{user_id}")
    response_data = response.json()
    user_balance = response_data['balance']

    text=f'Your wallet balance is ${user_balance}'
    await message.delete()
    await update_default_wallet_message(update, context, text)
    return ROUTE

def format_txn_history(response_data):
    if len(response_data) > 0:
        text = "Your transaction History is as follows \n\n"

        for transaction in response_data:
            transaction_type = transaction['transactionType']
            amount = transaction['amount']
            time = transaction['timestamp']
            event = transaction['eventTitle'] if 'eventTitle' in transaction else "-"

            text += f"Transaction Type: *{transaction_type}*\n" \
                f"Amount: ${amount}\n" \
                f"Time: {time}\n" \
                f"Event: {event}\n\n"
    else:
        text = "You have no prior transactions"
    return text
    
async def view_transaction_history(update: Update, context: CallbackContext):
    loading_message = "Retrieving transaction history..."
    message = await context.bot.send_message(chat_id=update.effective_chat.id, text=loading_message)
    query = update.callback_query
    await query.answer()
    user_id = query.from_user.id
    
    logger.info(f"Retrieving transaction history for User: {user_id}")
    response = requests.get(endpoint_url + f"/viewTransactionHistory/{user_id}")
    response_data = response.json()

    # Reverse the order of the response_data list to show latest transactions first
    response_data.reverse()

    # Get the current page number from user_data, default to page 1
    page_num = int(query.data.split("_")[-1])
    context.user_data['page_num'] = page_num

    # Calculate the starting and ending index of transactions to display
    num_per_page = 3
    start_idx = (page_num - 1) * num_per_page
    end_idx = start_idx + num_per_page

    # Slice the transactions to display only the ones for the current page
    transactions = response_data[start_idx:end_idx]

    # Format the transactions as text
    text = format_txn_history(transactions)
    await message.delete()

    # Create the inline keyboard for pagination
    keyboard = [[InlineKeyboardButton("< Back to Menu", callback_data="wallet_options"),],]
    if start_idx > 0:
        # Add "Previous" button if not on the first page
        keyboard.append([InlineKeyboardButton("Previous", callback_data=f"view_transaction_history_{page_num-1}")])
    if end_idx < len(response_data):
        # Add "Next" button if not on the last page
        keyboard.append([InlineKeyboardButton("Next", callback_data=f"view_transaction_history_{page_num+1}")])
    reply_markup = InlineKeyboardMarkup(keyboard)

    # Send the message with pagination and update user_data with the current page number
    await query.edit_message_text(text=text, reply_markup=reply_markup)

    return ROUTE

""""
=============================================================================================
top_up_wallet: Prompt new user for their details if required or direct them to get_topup_amount
get_topup_amount: prompt user for top up amount
proceed_payment: send payment invoice based on top up amount
precheckout: Answer the PreQecheckoutQuery
successful_payment: Confirms successful payment and sends API request to update relevant records
=============================================================================================
"""

async def top_up_wallet(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await get_topup_amount(update, context)
    return ROUTE
    

async def get_topup_amount(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("< Back to Menu", callback_data="wallet_options"),],
        [
            InlineKeyboardButton("$50", callback_data="top_up_50"),
            InlineKeyboardButton("$100", callback_data="top_up_100"),
            InlineKeyboardButton("$200", callback_data="top_up_200"),

        ],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    query = update.callback_query
    try:
        await query.edit_message_text(
            text="Please select an amount to top up your Mynt Wallet",
            reply_markup=reply_markup
        )
    except AttributeError:
        await update.message.reply_text(
            text="Please select an amount to top up your Mynt Wallet",
            reply_markup=reply_markup
        )
    

async def proceed_payment(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()    
    
    callback_data = update.callback_query.data[7:] ## (top_up_xx) The amount starts from 7th index
    topup_amount = int(callback_data)
    context.user_data["topup_amount"] = topup_amount

    await context.bot.send_invoice(
        chat_id=update.effective_chat.id,
        title=f"Top up Wallet",
        description="Topping up your Mynt wallet",
        payload="Custom-Payload",
        provider_token=PROVIDER_TOKEN,
        currency="SGD",
        prices=[LabeledPrice("Ticket Price", topup_amount * 100)]
    )
    return ROUTE
    

async def precheckout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info("Validating invoice payload")
    query = update.pre_checkout_query
    # check the payload
    if query.invoice_payload != "Custom-Payload":
        # answer False pre_checkout_query
        await query.answer(ok=False, error_message="Something went wrong...")
    else:
        await query.answer(ok=True)


async def successful_payment(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Confirms the successful payment."""
    user_id = update.message.from_user.id
    topup_amount = context.user_data["topup_amount"]
    logger.info(f'{user_id} has successfully topped up {topup_amount}')
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    data = {
        'user_id': user_id,
        'amount': topup_amount,
        'transaction_type': "TOP_UP",
        'timestamp': timestamp
    }
    response = requests.post(endpoint_url + "/topUpWallet", json=data)
    if response.status_code == 200:
        text=f"You have successfully topped up ${topup_amount}!"
        await send_default_wallet_message(update, context, text)

    else:
        await update.message.reply_text('An unexpected error occurred')
        return ConversationHandler.END
