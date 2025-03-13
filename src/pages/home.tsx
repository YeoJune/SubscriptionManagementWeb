import React from 'react';
import { Link } from 'react-router-dom';
import './home.css';

const Home: React.FC = () => {
  return (
    <div>
      <section className="home-hero">
        <h2> Comming Soon! </h2>
        <p> This is a simple React app with TypeScript and Webpack. </p>
        <Link to="#" className="btn"> Learn More </Link>
      </section>
    </div>
  );
}

export default Home;
