export default function handler(req, res) {
  res.status(200).json({
    status: "online",
    service: "vercel-serverless",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
} 