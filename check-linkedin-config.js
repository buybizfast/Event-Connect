require('dotenv').config({ path: '.env.local' });

console.log('LinkedIn OAuth Configuration Check');
console.log('=================================');
console.log('Client ID:', process.env.LINKEDIN_CLIENT_ID);
console.log('Client Secret:', process.env.LINKEDIN_CLIENT_SECRET ? '[CONFIGURED]' : 'Not configured');
console.log('Base URL:', process.env.NEXT_PUBLIC_BASE_URL);
console.log('Redirect URI used in code:', `${process.env.NEXT_PUBLIC_BASE_URL}/api/linkedin/callback`);
console.log('\nTo fix the "redirect_uri does not match" error:');
console.log('1. Go to https://www.linkedin.com/developers/apps');
console.log('2. Find your app with ID:', process.env.LINKEDIN_CLIENT_ID);
console.log('3. Go to the "Auth" tab');
console.log('4. Make sure the following redirect URI is added:');
console.log(`   ${process.env.NEXT_PUBLIC_BASE_URL}/api/linkedin/callback`);
console.log('\nAlternatively, update your .env.local file to match the redirect URI registered in LinkedIn'); 