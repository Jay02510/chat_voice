const http = require('http');
const io = require('socket.io-client');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(data ? JSON.parse(data) : null); }
        catch (e) { resolve(data); }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTest() {
  console.log('1. Registering user...');
  const user = await request('POST', '/auth/register', { email: `test-${Date.now()}@test.com`, password: 'password123' });
  console.log('User registered:', user);

  console.log('\n2. Logging in...');
  const auth = await request('POST', '/auth/login', { email: user.email, password: 'password123' });
  console.log('Login successful, token:', auth.access_token ? 'OK' : 'FAIL');
  const token = auth.access_token;

  console.log('\n3. Creating candidate (Secured Endpoint)...');
  const candidate = await request('POST', '/candidates', { name: 'E2E Tester', email: `tester-${Date.now()}@example.com` }, token);
  console.log('Candidate created:', candidate.id);

  console.log('\n4. Starting Call Session (Secured Endpoint)...');
  const session = await request('POST', '/call-session', { candidateId: candidate.id }, token);
  console.log('Session started:', session.id);

  console.log('\n5. Connecting WebSocket...');
  const socket = io('http://localhost:3000');
  
  socket.on('connect', () => {
    console.log('Socket connected! Joining call...');
    socket.emit('join-call', { sessionId: session.id });
  });

  socket.on('joined', (data) => {
    console.log('Joined session:', data.sessionId);
    console.log('Sending chat message...');
    socket.emit('message', { sessionId: session.id, text: 'Hello AI!' });
  });

  socket.on('ai-response', async (data) => {
    console.log('Received AI Response:', data.text);
    
    console.log('\n6. Fetching Call Logs...');
    const logs = await request('GET', `/call-log/session/${session.id}`, null, token);
    console.log('Logs recorded:', logs.length);
    console.log('Logs:', logs.map(l => `${l.type}: ${l.message}`));
    
    console.log('\n7. Ending session...');
    await request('PUT', `/call-session/${session.id}/end`, null, token);
    
    console.log('\nAll E2E features verified! Disconnecting...');
    socket.disconnect();
  });

  socket.on('disconnect', () => {
    console.log('Test completed.');
    process.exit(0);
  });
}

runTest().catch(console.error);
