import { Link } from "react-router-dom";

const FloatingChatLauncher = () => {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] md:bottom-6 md:right-6">
      <Link
        to="/agro-assist"
        aria-label="Open AgroAssist AI chat"
        className="pointer-events-auto block rounded-full transition-transform duration-200 hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary/40 active:scale-95"
      >
        <img
          src="/chat-robot.svg"
          alt="Open AgroAssist AI chat"
          className="h-20 w-20 rounded-full object-contain drop-shadow-[0_18px_28px_rgba(31,34,71,0.22)] md:h-24 md:w-24"
        />
      </Link>
    </div>
  );
};

export default FloatingChatLauncher;
