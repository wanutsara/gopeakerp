import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/hr/initiatives/cmmcdc546000bsbycj6vyzupi/quests',
  method: 'GET',
  headers: {
    // We need an auth cookie or we will get 401 Unauthorized
    // Let's modify the route temporarily to bypass auth for testing!
  }
};
