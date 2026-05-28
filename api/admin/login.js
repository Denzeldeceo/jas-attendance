import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// Parse multiple admins from environment variables
// Format in Vercel env vars:
//   ADMIN_USERS = Denzel:mypassword123,Janet:herpassword456
function getAdmins() {
  const raw = process.env.ADMIN_USERS || '';
  if (!raw) {
    // Fallback to single admin for backwards compatibility
    return [{
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    }];
  }
  return raw.split(',').map(entry => {
    const [username, ...rest] = entry.trim().split(':');
    return { username: username.trim(), password: rest.join(':').trim() };
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Please enter both username and password.' });
  }

  const admins = getAdmins();
  const match  = admins.find(
    a => a.username.toLowerCase() === username.toLowerCase() && a.password === password
  );

  if (!match) {
    return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
  }

  const token = jwt.sign({ role: 'admin', username: match.username }, JWT_SECRET, { expiresIn: '8h' });
  return res.status(200).json({ success: true, token, username: match.username });
}
