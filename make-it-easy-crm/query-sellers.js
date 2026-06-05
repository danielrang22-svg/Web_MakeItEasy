const dotenv = require('dotenv');
dotenv.config();

async function run() {
  try {
    const authRes = await fetch(`${process.env.SIIGO_API_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Partner-Id': process.env.SIIGO_PARTNER_ID,
      },
      body: JSON.stringify({
        username: process.env.SIIGO_USERNAME,
        access_key: process.env.SIIGO_ACCESS_KEY,
      }),
    });
    
    const authData = await authRes.json();
    const token = authData.access_token;
    
    // Get sellers / users
    const res = await fetch(`${process.env.SIIGO_API_URL}/v1/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Partner-Id': process.env.SIIGO_PARTNER_ID,
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await res.json();
    console.log('Sellers/Users:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
