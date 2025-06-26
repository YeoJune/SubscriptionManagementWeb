// src/components/DeliveryCalendar.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DeliveryCalendar.css';

interface DeliveryCalendarProps {
  requiredCount: number;
  selectedDates: string[];
  onDatesChange: (dates: string[]) => void;
}

const DeliveryCalendar: React.FC<DeliveryCalendarProps> = ({
  requiredCount,
  selectedDates,
  onDatesChange,
}) => {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableDates();
  }, [currentMonth]);

  const fetchAvailableDates = async () => {
    setLoading(true);
    try {
      const monthStr = currentMonth.toISOString().slice(0, 7);
      const response = await axios.get(
        `/api/delivery/available-dates?month=${monthStr}`
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

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const isCurrentMonth = date.getMonth() === month;
      const isAvailable = availableDates.includes(dateStr);
      const isSelected = selectedDates.includes(dateStr);
      const isPast = dateStr < today;

      days.push(
        <div
          key={dateStr}
          className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${
            isAvailable && !isPast ? 'available' : 'disabled'
          } ${isSelected ? 'selected' : ''}`}
          onClick={() => isAvailable && !isPast && handleDateClick(dateStr)}
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
