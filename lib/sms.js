// lib/sms.js
const db = require('./db');
const axios = require('axios');
require('dotenv').config();

// MessageService 클래스 정의
class MessageService {
  constructor({ apiKey, userId, sender, smsTemplate, senderKey }) {
    this.apiKey = apiKey;
    this.userId = userId;
    this.sender = sender;
    this.senderKey = senderKey;
    this.smsTemplate = smsTemplate;
  }

  formatMessage(template, params) {
    let message = template;
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(`#{${key}}`, value);
    });
    return message;
  }

  async sendSMS(messages) {
    try {
      // 메시지 길이에 따라 SMS/LMS 결정
      const isLMS = messages.some(({ params }) => {
        const formattedMessage = this.formatMessage(this.smsTemplate, params);
        return formattedMessage.length > 90; // 90자 이상이면 LMS
      });

      const formData = new URLSearchParams({
        key: this.apiKey,
        user_id: this.userId,
        sender: this.sender,
        cnt: messages.length,
        msg_type: isLMS ? 'LMS' : 'SMS',
        testmode_yn: process.env.NODE_ENV === 'production' ? 'N' : 'Y', // 운영 환경에서만 실제 발송
      });

      messages.forEach(({ phone, params }, index) => {
        const messageNum = index + 1;
        const formattedMessage = this.formatMessage(this.smsTemplate, params);
        formData.append(`rec_${messageNum}`, phone);
        formData.append(`msg_${messageNum}`, formattedMessage);

        // LMS인 경우 제목 추가
        if (isLMS) {
          formData.append(`title_${messageNum}`, '배송 관리 시스템 알림');
        }
      });

      // 실제 운영 환경에서만 API 호출
      if (process.env.NODE_ENV === 'production') {
        const response = await axios.post(
          'https://apis.aligo.in/send_mass/',
          formData.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        return {
          success: response.data.result_code > 0, // 양수값은 모두 성공
          successCount: response.data.success_cnt,
          errorCount: response.data.error_cnt,
          messages,
        };
      } else {
        // 개발 환경에서는 콘솔에 로그만 출력
        console.log('[개발 환경 SMS 시뮬레이션]', { formData, messages });
        return {
          success: true,
          successCount: messages.length,
          errorCount: 0,
          messages,
        };
      }
    } catch (error) {
      console.error('SMS 발송 오류:', error);
      return {
        success: false,
        error: error.message,
        messages,
      };
    }
  }

  async sendBulk(messages, type = 'sms') {
    // 500개씩 청크로 나누기
    const chunks = [];
    for (let i = 0; i < messages.length; i += 500) {
      chunks.push(messages.slice(i, i + 500));
    }

    const results = [];
    for (const chunk of chunks) {
      let result;
      if (type === 'sms') {
        result = await this.sendSMS(chunk);
      } else {
        throw new Error(`지원하지 않는 메시지 타입입니다: ${type}`);
      }

      results.push(result);

      // 청크 사이에 1초 대기
      if (chunks.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // 결과 집계
    const aggregatedResult = {
      success: results.every((r) => r.success),
      successCount: results.reduce((sum, r) => sum + r.successCount, 0),
      errorCount: results.reduce((sum, r) => sum + r.errorCount, 0),
      messages: results.flatMap((r) =>
        r.messages.map((msg) => ({
          ...msg,
          success: r.success,
          error: r.error,
        }))
      ),
    };

    return aggregatedResult;
  }
}

// SMS 서비스 설정
const messageService = new MessageService({
  apiKey: process.env.SMS_API_KEY || 'your_api_key',
  userId: process.env.SMS_USER_ID || 'your_user_id',
  sender: process.env.SMS_SENDER || 'your_sender_number',
  smsTemplate: '#{message}', // 기본 템플릿 형식
  senderKey: process.env.SMS_SENDER_KEY || 'your_sender_key',
});

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

// 배송 완료 SMS
async function sendDeliveryCompletionSMS(
  phoneNumber,
  userId,
  productName,
  deliveryDate
) {
  try {
    const message = `[배송 알림] ${userId}님, ${deliveryDate}에 주문하신 ${productName} 배송이 완료되었습니다. 감사합니다.`;

    // SMS 발송
    const result = await messageService.sendBulk([
      {
        phone: phoneNumber,
        params: { message },
      },
    ]);

    // 로그 기록
    await logSMS(phoneNumber, message, 'delivery_completion');

    return { success: result.success };
  } catch (error) {
    console.error('배송 완료 SMS 발송 오류:', error);
    return { success: false, error: error.message };
  }
}

// 배송 잔여 횟수 부족 알림 SMS (1-3회)
async function sendDeliveryReminderSMS(phoneNumber, userId, remainingCount) {
  try {
    const message = `[잔여 횟수 알림] ${userId}님, 현재 배송 잔여 횟수가 ${remainingCount}회 남았습니다. 추가 결제를 통해 구독을 연장해 주세요.`;

    // SMS 발송
    const result = await messageService.sendBulk([
      {
        phone: phoneNumber,
        params: { message },
      },
    ]);

    // 로그 기록
    await logSMS(phoneNumber, message, 'delivery_reminder');

    return { success: result.success };
  } catch (error) {
    console.error('배송 잔여 알림 SMS 발송 오류:', error);
    return { success: false, error: error.message };
  }
}

// 상품별 배송 잔여 횟수 알림 SMS
async function sendProductDeliveryReminderSMS(phoneNumber, userId, products) {
  try {
    const productDetails = products
      .map((p) => `${p.name}: ${p.remaining_count}회`)
      .join(', ');

    const message = `[배송 알림] ${userId}님, 상품별 남은 배송 횟수가 얼마 남지 않았습니다. (${productDetails}) 추가 구매를 고려해보세요.`;

    // SMS 발송
    const result = await messageService.sendBulk([
      {
        phone: phoneNumber,
        params: { message },
      },
    ]);

    // 로그 기록
    await logSMS(phoneNumber, message, 'product_delivery_reminder');

    return { success: result.success };
  } catch (error) {
    console.error('상품별 배송 잔여 알림 SMS 발송 오류:', error);
    return { success: false, error: error.message };
  }
}

// 배송 횟수 소진 알림 SMS (0회)
async function sendDeliveryEmptySMS(phoneNumber, userId) {
  try {
    const message = `[구독 만료 알림] ${userId}님, 배송 횟수가 모두 소진되었습니다. 서비스를 계속 이용하시려면 추가 결제가 필요합니다.`;

    // SMS 발송
    const result = await messageService.sendBulk([
      {
        phone: phoneNumber,
        params: { message },
      },
    ]);

    // 로그 기록
    await logSMS(phoneNumber, message, 'delivery_empty');

    return { success: result.success };
  } catch (error) {
    console.error('배송 소진 SMS 발송 오류:', error);
    return { success: false, error: error.message };
  }
}

// 사용자 정의 SMS
async function sendCustomSMS(phoneNumber, message, type = 'custom') {
  try {
    // SMS 발송
    const result = await messageService.sendBulk([
      {
        phone: phoneNumber,
        params: { message },
      },
    ]);

    // 로그 기록
    await logSMS(phoneNumber, message, type);

    return { success: result.success };
  } catch (error) {
    console.error('커스텀 SMS 발송 오류:', error);
    return { success: false, error: error.message };
  }
}

// 여러 번호로 동일한 메시지 전송
async function sendBulkSMS(phoneNumbers, message, type = 'bulk') {
  try {
    // 메시지 배열 생성
    const messages = phoneNumbers.map((phone) => ({
      phone,
      params: { message },
    }));

    // SMS 벌크 발송
    const result = await messageService.sendBulk(messages);

    // 로그 기록 (각 수신자마다)
    for (const phone of phoneNumbers) {
      await logSMS(phone, message, type);
    }

    return result;
  } catch (error) {
    console.error('대량 SMS 발송 오류:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendDeliveryCompletionSMS,
  sendDeliveryReminderSMS,
  sendDeliveryEmptySMS,
  sendCustomSMS,
  sendBulkSMS,
  sendProductDeliveryReminderSMS,
};
