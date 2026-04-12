'use client';

export const BackgroundImage = () => {
  return (
    <div className="absolute inset-0 z-0">
      {/* Main blurred background */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-lg"
        style={{
          backgroundImage: "url('/intro_page.jpg')"
        }}
      />

      {/* Extra blur for smoothness */}
      <div className="absolute inset-0 backdrop-blur-sm"></div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 via-blue-800/25 to-transparent"></div>
    </div>
  );
};