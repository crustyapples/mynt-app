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

    try:
        if context.user_data['invoice_message'] != None: # if I want to delete the top up wallet message that is being triggered by send_default_wallet_message
            invoice = context.user_data['invoice_message']
            await invoice.delete()
            context.user_data['invoice_message'] = None # doing this in case there are errors later if the invoice_message is not found (already deleted)

    except Exception:
        print("invoice message has not been set")

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

    try:
        if context.user_data['events_messages'] != None: # if I want to delete the events message that is being triggered by view_events in bot_utils
            event_messages = context.user_data['events_messages']

            for message in event_messages:
                await message.delete() # deleting each message

            context.user_data['events_messages'] = None # doing this in case there are errors later if the 'events_messages' is not found (already deleted)

    except Exception:
        print("event messages has not been set")

    try:
        if context.user_data["registration_confirmation"] != None: # if I want to delete the wallet deduction that is being triggered when a user successful registers for an event in complete_purchase in bot_event_options
            registration_confirmation = context.user_data["registration_confirmation"]

            await registration_confirmation.delete() # deleting message

            context.user_data["registration_confirmation"] = None # doing this in case there are errors later if the 'registration_confirmation' is not found (already deleted)

    except Exception:
        print("registration message has not been set")
    
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
    original_message = await context.bot.send_message( 
        chat_id=update.effective_chat.id,
        text=text,
        reply_markup=reply_markup, 
    )
    context.user_data['original_message'] = original_message # when we send a new message, make this the main message

async def send_default_event_message(update, context: ContextTypes.DEFAULT_TYPE, text):
    keyboard = [[InlineKeyboardButton("< Back to Menu", callback_data="event_options"),],]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # code below deletes the old bot message that is stored in the context
    original_message = context.user_data['original_message'] # initialized during the start function
    await original_message.delete()

    original_message = await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=text,
        reply_markup=reply_markup, 
    )

    context.user_data['original_message'] = original_message

async def send_default_wallet_message(update, context: ContextTypes.DEFAULT_TYPE, text):
    keyboard = [[InlineKeyboardButton("< Back to Menu", callback_data="wallet_options"),],]
    reply_markup = InlineKeyboardMarkup(keyboard)

    try:
        if context.user_data['invoice_message'] != None: # if I want to delete the top up wallet message and set the new message as the original_message
            original_message = await context.bot.send_message(
                chat_id=update.effective_chat.id,
                text=text,
                reply_markup=reply_markup,
                parse_mode='Markdown',
            )
            context.user_data['original_message'] = original_message
        elif context.user_data['successfully_payed'] == True:
            original_message = await context.bot.send_message(
                chat_id=update.effective_chat.id,
                text=text,
                reply_markup=reply_markup,
                parse_mode='Markdown',
            )
            context.user_data['original_message'] = original_message
        else:
            await context.bot.send_message(
                chat_id=update.effective_chat.id,
                text=text,
                reply_markup=reply_markup, 
            )

    except Exception:
        await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text=text,
            reply_markup=reply_markup, 
        )

        print("context.user_data['successfully_payed'] has not been set yet")
       
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
