export const GlobalAnimations = () => (
  <style jsx global>{`
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }
    @keyframes shimmer-green {
      0% { transform: translateX(-100%); opacity: 0.7; }
      50% { opacity: 1; }
      100% { transform: translateX(100%); opacity: 0.7; }
    }
    @keyframes bounce-micro {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    .animate-shimmer {
      animation: shimmer 2s ease-in-out infinite;
    }
    .animate-shimmer-green {
      animation: shimmer-green 1.5s ease-in-out infinite;
    }
    .animate-bounce {
      animation: bounce-micro 1s ease-in-out infinite;
    }
  `}</style>
);