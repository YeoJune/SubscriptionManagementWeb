// lib/sms.js
const db = require('./db');
const axios = require('axios');
require('dotenv').config();

const MAX_PARAM_LENGTH = 40;

// MessageService 클래스 정의
class MessageService {
  constructor({ apiKey, userId, sender, senderKey }) {
    this.apiKey = apiKey;
    this.userId = userId;
    this.sender = sender;
    this.senderKey = senderKey;
    this.baseUrl = 'https://kakaoapi.aligo.in/akv10/alimtalk/send/';
  }

  formatMessage(template, params) {
    let message = template;
    Object.entries(params).forEach(([key, value]) => {
      const truncatedValue =
        value && value.length > MAX_PARAM_LENGTH
          ? value.substring(0, MAX_PARAM_LENGTH) + '...'
          : value;
      message = message.replace(`#{${key}}`, truncatedValue);
    });
    return message;
  }

  async sendKakaoMessage(messages, config) {
    try {
      const formData = new URLSearchParams({
        apikey: this.apiKey,
        userid: this.userId,
        senderkey: this.senderKey,
        tpl_code: config.templateCode,
        sender: this.sender,
        failover: 'Y',
        testMode: 'N',
      });

      messages.forEach(({ phone, params }, index) => {
        const num = index + 1;
        formData.append(`receiver_${num}`, phone);
        formData.append(`subject_${num}`, config.subject);
        formData.append(
          `message_${num}`,
          this.formatMessage(config.message, params)
        );

        if (config.fmessage) {
          formData.append(
            `fmessage_${num}`,
            this.formatMessage(config.fmessage, params)
          );
        }

        if (config.buttons) {
          formData.append(
            `button_${num}`,
            JSON.stringify({ button: config.buttons })
          );
        }
      });

      const response = await axios.post(this.baseUrl, formData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return {
        success: response.data.code === 0,
        successCount: response.data.info.scnt,
        errorCount: response.data.info.fcnt,
        messages,
      };
    } catch (error) {
      console.error('카카오 알림톡 발송 오류:', error);
      return {
        success: false,
        error: error.message,
        messages,
      };
    }
  }

  // 결제 완료 알림톡 (UC_7741)
  async sendPaymentCompletion(messages) {
    const config = {
      templateCode: 'UC_7741',
      subject: '정기배송 결제 완료',
      message: `#{고객명}님의 #{상품명} 상품의 결제가 완료되었습니다.
매주 월, 수, 금 배송 예정이며,
배송주기에 공휴일/연휴가있을시 그전날로 배송이됩니다.
맛있는식단으로 오늘 하루도 건강하세요!`,
      fmessage: `#{고객명}님의 #{상품명} 상품의 결제가 완료되었습니다.
매주 월, 수, 금 배송 예정이며,
배송주기에 공휴일/연휴가있을시 그전날로 배송이됩니다.
맛있는식단으로 오늘 하루도 건강하세요!`,
      buttons: [
        {
          name: '채널추가',
          linkType: 'AC',
          linkTypeName: '채널 추가',
        },
      ],
    };

    return this.sendKakaoMessage(messages, config);
  }

  // 배송 안내 알림톡 (UC_7742)
  async sendDeliveryNotification(messages) {
    const config = {
      templateCode: 'UC_7742',
      subject: '상품 배송 안내',
      message: `#{고객명}님의 #{상품명} 상품이 오늘 배송됩니다.
남은 발송 횟수는 #{남은횟수}회입니다.`,
      fmessage: `#{고객명}님의 #{상품명} 상품이 오늘 배송됩니다.
남은 발송 횟수는 #{남은횟수}회입니다.`,
      buttons: [
        {
          name: '채널추가',
          linkType: 'AC',
          linkTypeName: '채널 추가',
        },
      ],
    };

    return this.sendKakaoMessage(messages, config);
  }
}

// SMS 서비스 설정 (기존 환경변수 그대로 사용)
const messageService = new MessageService({
  apiKey: process.env.SMS_API_KEY,
  userId: process.env.SMS_USER_ID,
  sender: process.env.SMS_SENDER,
  senderKey: process.env.SMS_SENDER_KEY,
});

// 안전한 메시지 발송 함수
async function safeSendMessage(messageService, method, messages, context = '') {
  if (!messages || messages.length === 0) {
    console.log(`No messages to send for ${context}`);
    return;
  }

  try {
    const result = await messageService[method](messages);
    console.log(`${context} message result:`, {
      success: result.success,
      successCount: result.successCount,
      errorCount: result.errorCount,
    });
    return result;
  } catch (error) {
    console.error(`Error sending ${context} message:`, error);
    return { success: false, error: error.message };
  }
}

// SMS 발송 로그 기록
function logSMS(recipient, message, type) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO sms_logs (recipient, message, type) VALUES (?, ?, ?)`,
      [recipient, message, type],
      function (err) {
        if (err) {
          console.error('SMS 로그 저장 오류:', err);
          reject(err);
          return;
        }

        resolve(this.lastID);
      }
    );
  });
}

// 결제 완료 알림톡 발송
async function sendPaymentCompletionAlimtalk(
  phoneNumber,
  customerName,
  productName
) {
  try {
    const messages = [
      {
        phone: phoneNumber,
        params: {
          고객명: customerName,
          상품명: productName,
        },
      },
    ];

    const result = await safeSendMessage(
      messageService,
      'sendPaymentCompletion',
      messages,
      'payment completion'
    );

    // 로그 기록
    if (result && result.success) {
      const logMessage = `${customerName}님의 ${productName} 상품의 결제가 완료되었습니다.`;
      await logSMS(phoneNumber, logMessage, 'payment_completion');
    }

    return { success: result?.success || false };
  } catch (error) {
    console.error('결제 완료 알림톡 발송 오류:', error);
    return { success: false, error: error.message };
  }
}

// 배송 안내 알림톡 발송
async function sendDeliveryNotificationAlimtalk(
  phoneNumber,
  customerName,
  productName,
  remainingCount
) {
  try {
    const messages = [
      {
        phone: phoneNumber,
        params: {
          고객명: customerName,
          상품명: productName,
          남은횟수: remainingCount.toString(),
        },
      },
    ];

    const result = await safeSendMessage(
      messageService,
      'sendDeliveryNotification',
      messages,
      'delivery notification'
    );

    // 로그 기록
    if (result && result.success) {
      const logMessage = `${customerName}님의 ${productName} 상품이 오늘 배송됩니다. 남은 발송 횟수는 ${remainingCount}회입니다.`;
      await logSMS(phoneNumber, logMessage, 'delivery_notification');
    }

    return { success: result?.success || false };
  } catch (error) {
    console.error('배송 안내 알림톡 발송 오류:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPaymentCompletionAlimtalk,
  sendDeliveryNotificationAlimtalk,
};
