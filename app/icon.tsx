import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#299D91',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 800,
            fontFamily: 'sans-serif',
            letterSpacing: 1,
          }}
        >
          FT
        </span>
      </div>
    ),
    { ...size },
  );
}
