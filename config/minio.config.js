// config/minio.config.js
export const minioConfig = {
  endPoint: '127.0.0.1', // 明确使用 127.0.0.1
  port: 9005,
  useSSL: false, // 必须是 false
  accessKey: 'isaacwx',
  secretKey: '12345678',
  region: 'us-east-1',
}
