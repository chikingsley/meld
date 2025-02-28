// This is a plain Vercel API function that doesn't depend on Nitro
export default function (req, res) {
  res.status(200).json({
    status: "success",
    message: "Direct Vercel function is working!",
    timestamp: new Date().toISOString(),
    path: req.url
  });
} 