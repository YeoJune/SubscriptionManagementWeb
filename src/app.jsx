import React from 'react';
import './global.css'; // Import the CSS file

const App = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Welcome to the Awesome React App!</h1>
      </header>
      <main className="app-content">
        <p>This is a basic app component for testing with awesome CSS styling.</p>
      </main>
      <footer className="app-footer">
        <p>&copy; 2025 My Awesome App</p>
      </footer>
    </div>
  );
};

export default App;
