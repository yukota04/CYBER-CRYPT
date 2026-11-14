import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {loadIconAtlas} from './game/iconAtlas';

void loadIconAtlas();

createRoot(document.getElementById('root')!).render(<App />);
