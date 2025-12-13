import React, { useState } from "react";

const FullscreenYouTubeVideo: React.FC = () => {
  const [unmuted, setUnmuted] = useState(false);

  const enableSound = () => {
    setUnmuted(true);
  };

  return (
    <div style={styles.container} onClick={enableSound}>
      <iframe
        style={styles.iframe}
        src={`https://www.youtube.com/embed/g5JY2TONktY?autoplay=1&mute=${unmuted ? 0 : 1}&controls=0&playsinline=1&loop=1&playlist=g5JY2TONktY&modestbranding=1`}
        title="YouTube video"
        allow="autoplay"
        allowFullScreen
      ></iframe>

      {!unmuted && (
        <div style={styles.tapText}>
          🔊 Tap to enable sound
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    zIndex: -1,
    backgroundColor: "#000",
    cursor: "pointer",
  },
  iframe: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "120vw",
    height: "120vh",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  tapText: {
    position: "absolute",
    bottom: "30px",
    left: "50%",
    transform: "translateX(-50%)",
    color: "#fff",
    fontSize: "18px",
    background: "rgba(0,0,0,0.5)",
    padding: "8px 16px",
    borderRadius: "6px",
  },
};

export default FullscreenYouTubeVideo;