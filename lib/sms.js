// lib/sms.js
const db = require('./db');

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

/**
 * 실제 SMS 발송 처리 (구현 필요)
 * 실제 SMS 발송 API 연동은 여기에 구현
 * 현재는 콘솔에 로그만 출력
 */
function sendSMS(phoneNumber, message) {
  // 플레이스홀더: 실제 SMS 발송 구현이 필요합니다
  console.log(`[SMS 발송] 수신자: ${phoneNumber}, 메시지: ${message}`);
  return Promise.resolve({ success: true, phoneNumber, message });
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
    await sendSMS(phoneNumber, message);

    // 로그 기록
    await logSMS(phoneNumber, message, 'delivery_completion');

    return { success: true };
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
    await sendSMS(phoneNumber, message);

    // 로그 기록
    await logSMS(phoneNumber, message, 'delivery_reminder');

    return { success: true };
  } catch (error) {
    console.error('배송 잔여 알림 SMS 발송 오류:', error);
    return { success: false, error: error.message };
  }
}

// 배송 횟수 소진 알림 SMS (0회)
async function sendDeliveryEmptySMS(phoneNumber, userId) {
  try {
    const message = `[구독 만료 알림] ${userId}님, 배송 횟수가 모두 소진되었습니다. 서비스를 계속 이용하시려면 추가 결제가 필요합니다.`;

    // SMS 발송
    await sendSMS(phoneNumber, message);

    // 로그 기록
    await logSMS(phoneNumber, message, 'delivery_empty');

    return { success: true };
  } catch (error) {
    console.error('배송 소진 SMS 발송 오류:', error);
    return { success: false, error: error.message };
  }
}

// 사용자 정의 SMS
async function sendCustomSMS(phoneNumber, message, type = 'custom') {
  try {
    // SMS 발송
    await sendSMS(phoneNumber, message);

    // 로그 기록
    await logSMS(phoneNumber, message, type);

    return { success: true };
  } catch (error) {
    console.error('커스텀 SMS 발송 오류:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendDeliveryCompletionSMS,
  sendDeliveryReminderSMS,
  sendDeliveryEmptySMS,
  sendCustomSMS,
};
