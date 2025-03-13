import React from 'react';
import { Routes } from 'react-router-dom';
import Header from './components/header';
import Footer from './components/footer';

const App: React.FC = () => {
  return (
    <div>
      <Header />
      <main>
        <h1>My App</h1>
        <Routes>
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
