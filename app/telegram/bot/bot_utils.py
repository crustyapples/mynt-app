from telegram import (
    Update, InlineKeyboardButton,InlineKeyboardMarkup, 
    )
from telegram.ext import (ContextTypes)

ROUTE, NEW_USER, NEW_USER_NAME, SHOW_QR = range(4)

""""
=============================================================================================
wallet_options: Modify the current text (start msg) and display wallet options
event_options: Modify the current text (start msg) and display event options
send_default_message: Send message displaying the text(variable) passed, as well as Menu option. There are also wallet and event variations of the same function which routes different "< Back" buttons
update_default_message: Update the previous message with the text(variable) passed, as well as Menu Option. There are also wallet and event variations of the same function which routes different "< Back" buttons
=============================================================================================
"""


async def wallet_options(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    keyboard = [
        [InlineKeyboardButton("View Wallet Balance",callback_data="view_wallet_balance"),],
        [InlineKeyboardButton("View Transaction History",callback_data="view_transaction_history_1"),],
        [InlineKeyboardButton("Top Up Wallet", callback_data="top_up_wallet"),],
        [InlineKeyboardButton("< Back", callback_data="start"),],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text(
        text="Please select one of the following options below", reply_markup=reply_markup
    )
    return ROUTE


async def event_options(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    keyboard = [
        [InlineKeyboardButton("View Ongoing Events", callback_data="view_events"),],
        [InlineKeyboardButton("View Registration Status", callback_data="check_registration"),],
        [InlineKeyboardButton("Redeem Event Ticket", callback_data="redeem"),],
        [InlineKeyboardButton("< Back", callback_data="start"),],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text(
        text="Please select one of the following options below", reply_markup=reply_markup
    )
    return ROUTE

async def send_default_message(update, context: ContextTypes.DEFAULT_TYPE, text):
    keyboard = [[InlineKeyboardButton("< Back to Menu", callback_data="start"),],]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=text,
        reply_markup=reply_markup, 
    )

async def send_default_event_message(update, context: ContextTypes.DEFAULT_TYPE, text):
    keyboard = [[InlineKeyboardButton("< Back to Menu", callback_data="event_options"),],]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=text,
        reply_markup=reply_markup, 
    )

async def send_default_wallet_message(update, context: ContextTypes.DEFAULT_TYPE, text):
    keyboard = [[InlineKeyboardButton("< Back to Menu", callback_data="wallet_options"),],]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=text,
        reply_markup=reply_markup, 
    )
       
async def update_default_event_message(update, context: ContextTypes.DEFAULT_TYPE, text):
    keyboard = [[InlineKeyboardButton("< Back to Menu", callback_data="event_options"),],]
    reply_markup = InlineKeyboardMarkup(keyboard)
    query = update.callback_query
    await query.edit_message_text(
        text=text,
        reply_markup=reply_markup,
        parse_mode='Markdown',
    )

async def update_default_wallet_message(update, context: ContextTypes.DEFAULT_TYPE, text):
    keyboard = [[InlineKeyboardButton("< Back to Menu", callback_data="wallet_options"),],]
    reply_markup = InlineKeyboardMarkup(keyboard)
    query = update.callback_query
    await query.edit_message_text(
        text=text,
        reply_markup=reply_markup,
        parse_mode='Markdown',
    )
    
async def update_default_start_message(update, context: ContextTypes.DEFAULT_TYPE, text):
    keyboard = [[InlineKeyboardButton("< Back to Menu", callback_data="start"),],]
    reply_markup = InlineKeyboardMarkup(keyboard)
    query = update.callback_query
    await query.edit_message_text(
        text=text,
        reply_markup=reply_markup,
        parse_mode='Markdown',
    )
