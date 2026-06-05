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
    
    // The invoice ID from the E2E test: 642c9adc-4d58-4355-ba79-837c32553caa
    const invoiceId = "642c9adc-4d58-4355-ba79-837c32553caa";
    
    console.log(`Sending DELETE request to Siigo for invoice ID: ${invoiceId}...`);
    
    const res = await fetch(`${process.env.SIIGO_API_URL}/v1/invoices/${invoiceId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Partner-Id': process.env.SIIGO_PARTNER_ID,
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Status:', res.status);
    const data = await res.text();
    console.log('Response:', data);
  } catch (err) {
    console.error(err);
  }
}
run();
