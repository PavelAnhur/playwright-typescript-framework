export const env = {
  name: process.env['ENV_NAME'] || 'local',
  webURL: process.env['WEB_URL'] || 'http://localhost:4000',
  apiURL: process.env['API_URL'] || 'http://localhost:4000/api/v1',
};