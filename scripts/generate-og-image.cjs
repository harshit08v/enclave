const { ImageResponse } = require('next/og');
const React = require('react');
const fs = require('fs');

async function generateOgImage() {
  const logoBuffer = fs.readFileSync('public/logo.jpg');
  const logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;

  const imageResponse = new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0a0d0b',
          backgroundImage: 'radial-gradient(circle at 50% 10%, #162920 0%, #0a0d0b 70%)',
          padding: '60px 70px',
          boxSizing: 'border-box',
          fontFamily: 'sans-serif',
          color: '#ffffff',
          border: '1px solid #1f3328',
          position: 'relative',
        },
      },
      // Top status row
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#12231b',
              border: '1px solid #224233',
              borderRadius: '9999px',
              padding: '8px 20px',
            },
          },
          React.createElement('div', {
            style: {
              width: '10px',
              height: '10px',
              borderRadius: '9999px',
              backgroundColor: '#10b981',
              boxShadow: '0 0 12px #10b981',
            },
          }),
          React.createElement(
            'span',
            {
              style: {
                fontSize: '15px',
                fontWeight: 600,
                color: '#6ee7b7',
                letterSpacing: '0.12em',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
              },
            },
            'Zero Retention · E2EE Relay'
          )
        ),
        React.createElement(
          'div',
          {
            style: {
              fontSize: '18px',
              fontWeight: 500,
              color: '#80968b',
              letterSpacing: '0.08em',
              fontFamily: 'monospace',
            },
          },
          'enclave.vercel.app'
        )
      ),

      // Center content
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            marginTop: '10px',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '22px',
            },
          },
          React.createElement('img', {
            src: logoBase64,
            style: {
              width: '84px',
              height: '84px',
              borderRadius: '18px',
              border: '2px solid #2b4f3d',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            },
          }),
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
              },
            },
            React.createElement(
              'span',
              {
                style: {
                  fontSize: '44px',
                  fontWeight: 900,
                  letterSpacing: '0.22em',
                  color: '#ffffff',
                  fontFamily: 'monospace',
                },
              },
              'ENCLAVE'
            ),
            React.createElement(
              'span',
              {
                style: {
                  fontSize: '15px',
                  color: '#10b981',
                  letterSpacing: '0.2em',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                },
              },
              'Private by Design'
            )
          )
        ),
        React.createElement(
          'h1',
          {
            style: {
              fontSize: '46px',
              fontWeight: 800,
              lineHeight: 1.15,
              color: '#f9fafb',
              margin: '0',
              letterSpacing: '-0.02em',
            },
          },
          'Conversations that don’t need to stay.'
        ),
        React.createElement(
          'p',
          {
            style: {
              fontSize: '21px',
              color: '#9ca3af',
              lineHeight: 1.45,
              margin: '0',
              maxWidth: '920px',
            },
          },
          'Private, ephemeral, browser-encrypted chat & calls. Zero server plaintext retention, zero account tracking, and permanently obliterated when you leave.'
        )
      ),

      // Bottom feature highlights
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            gap: '14px',
            alignItems: 'center',
            paddingTop: '20px',
            borderTop: '1px solid #1a2a22',
          },
        },
        [
          '🔒 AES-256-GCM + Argon2id',
          '⚡ Zero Disk Chat Logs',
          '📞 Encrypted Voice & Video',
          '🛡️ Disposable Chambers',
        ].map((feat, i) =>
          React.createElement(
            'div',
            {
              key: i,
              style: {
                backgroundColor: '#101c16',
                border: '1px solid #1e382b',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#a7f3d0',
                letterSpacing: '0.04em',
                fontFamily: 'monospace',
              },
            },
            feat
          )
        )
      )
    ),
    {
      width: 1200,
      height: 630,
    }
  );

  const arrayBuffer = await imageResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  fs.writeFileSync('public/og-image.png', buffer);
  console.log(`✅ Generated public/og-image.png (${buffer.length} bytes, 1200x630)`);
}

generateOgImage().catch(console.error);
