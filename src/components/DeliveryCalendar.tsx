// src/components/DeliveryCalendar.tsx - 백엔드에서 모든 날짜 계산 처리
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DeliveryCalendar.css';

interface DeliveryCalendarProps {
  requiredCount: number;
  selectedDates: string[];
  onDatesChange: (dates: string[]) => void;
  userId?: string;
}

const DeliveryCalendar: React.FC<DeliveryCalendarProps> = ({
  requiredCount,
  selectedDates,
  onDatesChange,
  userId,
}) => {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableDates();
  }, [currentMonth, requiredCount]);

  const fetchAvailableDates = async () => {
    setLoading(true);
    try {
      const monthStr = currentMonth.toISOString().slice(0, 7);
      const params = new URLSearchParams({
        month: monthStr,
        required_count: requiredCount.toString(),
      });

      if (userId) {
        params.append('user_id', userId);
      }

      const response = await axios.get(
        `/api/delivery/available-dates?${params}`
      );
      setAvailableDates(response.data.available_dates || []);
    } catch (error) {
      console.error('배송 가능 날짜 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (dateStr: string) => {
    const isSelected = selectedDates.includes(dateStr);
    let newDates;

    if (isSelected) {
      newDates = selectedDates.filter((d) => d !== dateStr);
    } else {
      if (selectedDates.length >= requiredCount) return;
      newDates = [...selectedDates, dateStr].sort();
    }

    onDatesChange(newDates);
  };

  const changeMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  // 날짜를 YYYY-MM-DD 형식으로 변환 (로컬 시간대 사용)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = formatDateLocal(date);
      const isCurrentMonth = date.getMonth() === month;
      const isAvailable = availableDates.includes(dateStr);
      const isSelected = selectedDates.includes(dateStr);

      days.push(
        <div
          key={dateStr}
          className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${
            isAvailable ? 'available' : 'disabled'
          } ${isSelected ? 'selected' : ''}`}
          onClick={() => isAvailable && handleDateClick(dateStr)}
        >
          {date.getDate()}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="delivery-calendar">
      <div className="calendar-header">
        <button onClick={() => changeMonth(-1)} className="month-nav">
          ←
        </button>
        <h3>
          {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
        </h3>
        <button onClick={() => changeMonth(1)} className="month-nav">
          →
        </button>
      </div>

      <div className="selection-status">
        {requiredCount}개 중 {selectedDates.length}개 선택됨
      </div>

      {loading ? (
        <div className="calendar-loading">로딩 중...</div>
      ) : (
        <>
          <div className="calendar-weekdays">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="weekday">
                {day}
              </div>
            ))}
          </div>
          <div className="calendar-grid">{renderCalendar()}</div>
        </>
      )}

      <div className="calendar-legend">
        <div>
          <span className="legend-available"></span> 선택 가능
        </div>
        <div>
          <span className="legend-selected"></span> 선택됨
        </div>
        <div>
          <span className="legend-disabled"></span> 선택 불가
        </div>
      </div>
    </div>
  );
};

export default DeliveryCalendar;
