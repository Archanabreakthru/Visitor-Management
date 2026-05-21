// Telegram Bot Service for Visitor Management System
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.bot = null;
    
    if (this.botToken && this.chatId) {
      this.initializeBot();
    }
  }
  
  initializeBot() {
    try {
      this.bot = new TelegramBot(this.botToken, { polling: true });
      console.log('Telegram bot initialized successfully with polling mode');

      // Forward callback queries to the local webhook handler so buttons work without ngrok
      this.bot.on('callback_query', async (callbackQuery) => {
        try {
          await fetch(`http://localhost:${process.env.PORT || 3001}/api/visits/telegram/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query: callbackQuery })
          });
        } catch (err) {
          console.error('Failed to process callback query locally:', err);
        }
      });
    } catch (error) {
      console.error('Failed to initialize Telegram bot:', error);
    }
  }
  
  // Send visitor approval request to Telegram
  async sendVisitorNotification(visit) {
    if (!this.bot || !this.chatId) {
      console.log('Telegram bot not configured. Skipping notification.');
      return false;
    }
    
    try {
      const message = this.formatVisitorMessage(visit);
      const keyboard = this.createApprovalKeyboard(visit.id);
      
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      console.log(`Telegram notification sent for visitor: ${visit.name}`);
      return true;
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      return false;
    }
  }
  
  // Format visitor details for Telegram message
  formatVisitorMessage(visit) {
    return `
<b>🚪 New Visitor Request</b>

<b>👤 Name:</b> ${visit.name}
<b>📞 Mobile:</b> ${visit.phone}
<b>🏢 Purpose:</b> ${visit.purpose}
<b>👨‍💼 Host:</b> ${visit.host_name || 'Unknown'}
<b>🆔 Visit ID:</b> ${visit.id}
${visit.company ? `<b>🏢 Company:</b> ${visit.company}` : ''}
${visit.email ? `<b>📧 Email:</b> ${visit.email}` : ''}
${visit.id_type && visit.id_number ? `<b>🪪 ID:</b> ${visit.id_type} - ${visit.id_number}` : ''}
    `.trim();
  }
  
  // Create inline keyboard for approve/reject buttons
  createApprovalKeyboard(visitId) {
    return [
      [
        {
          text: '✅ Approve',
          callback_data: `approve_${visitId}`
        },
        {
          text: '❌ Reject',
          callback_data: `reject_${visitId}`
        }
      ]
    ];
  }
  
  // Handle callback queries from Telegram buttons
  handleCallbackQuery(callbackQuery) {
    const { data, message } = callbackQuery;
    
    if (!data) return null;
    
    // Parse callback data: approve_<visitId> or reject_<visitId>
    const [action, visitId] = data.split('_');
    
    if (!['approve', 'reject'].includes(action) || !visitId) {
      return null;
    }
    
    return {
      action, // 'approve' or 'reject'
      visitId,
      messageId: message.message_id,
      chatId: message.chat.id
    };
  }
  
  // Send confirmation message after action
  async sendActionConfirmation(chatId, messageId, action, visitName) {
    try {
      const actionText = action === 'approve' ? 'APPROVED ✅' : 'REJECTED ❌';
      await this.bot.editMessageText(
        `<b>Visitor Request ${actionText}</b>\n\n<b>Visitor:</b> ${visitName}`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML'
        }
      );
    } catch (error) {
      console.error('Failed to send action confirmation:', error);
    }
  }
}

module.exports = new TelegramService();