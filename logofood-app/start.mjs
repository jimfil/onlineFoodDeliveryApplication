import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  console.log('loading .env');
  dotenv.config();
}

import { app } from './app.mjs';

import { initializeCategories } from './model/restaurant-model.mjs';

const port = process.env.PORT || '5000';

// Initialize DB categories before starting the server
initializeCategories().then(() => {
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`LogoFood SSR running at http://127.0.0.1:${port}`);
  });

  process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    console.log('Closing http server.');
    server.close(() => {
      console.log('Http server closed.');
    });
  });
}).catch(err => {
  console.error('Failed to initialize categories:', err);
  process.exit(1);
});
