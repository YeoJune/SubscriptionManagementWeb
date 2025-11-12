// src/pages/nutrition.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './nutrition.css';

interface NutritionInfo {
  id: number;
  image_path: string;
  created_at: string;
}

const Nutrition: React.FC = () => {
  const [nutritionInfo, setNutritionInfo] = useState<NutritionInfo | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchNutritionInfo();
  }, []);

  const fetchNutritionInfo = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/nutrition');
      setNutritionInfo(response.data.nutrition);
    } catch (error) {
      console.error('Failed to fetch nutrition info:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nutrition-container">
      <h1 className="nutrition-title">영양성분</h1>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>로딩 중...</p>
        </div>
      ) : nutritionInfo && nutritionInfo.image_path ? (
        <div className="nutrition-content">
          <img
            src={nutritionInfo.image_path}
            alt="영양성분표"
            className="nutrition-image"
          />
        </div>
      ) : (
        <div className="no-nutrition">
          <p>등록된 영양성분 정보가 없습니다.</p>
        </div>
      )}
    </div>
  );
};

export default Nutrition;
