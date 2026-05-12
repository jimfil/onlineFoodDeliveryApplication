import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  console.log('loading .env');
  dotenv.config();
}

import { app } from './app.mjs';

const port = process.env.PORT || '3000';

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`LogoFood SSR running at http://0.0.0.0:${port}`);
});

process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  console.log('Closing http server.');
  server.close(() => {
    console.log('Http server closed.');
  });
});
