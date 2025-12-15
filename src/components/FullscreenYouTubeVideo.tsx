import React, { useState, useRef, useEffect } from "react";

const FullscreenYouTubeVideo: React.FC = () => {
  const [unmuted, setUnmuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cursorTimeoutRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const enableSound = () => {
    setUnmuted(true);
  };

  const seekVideo = (seconds: number) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      setCurrentTime(newTime);
      
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [newTime, true],
        }),
        "*"
      );
    }
  };

  const seekToTime = (time: number) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const newTime = Math.max(0, Math.min(duration, time));
      setCurrentTime(newTime);
      
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [newTime, true],
        }),
        "*"
      );
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (progressBarRef.current && duration > 0) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clickX = clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      seekToTime(newTime);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressBarClick(e);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressBarClick(e);
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (isDragging && progressBarRef.current && duration > 0) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clickX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      const newTime = percentage * duration;
      seekToTime(newTime);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    // Keyboard controls (desktop only)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMobile) return; // Disable keyboard controls on mobile
      
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          seekVideo(10);
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekVideo(-10);
          break;
        case "ArrowUp":
          e.preventDefault();
          seekVideo(30);
          break;
        case "ArrowDown":
          e.preventDefault();
          seekVideo(-30);
          break;
        case " ":
          e.preventDefault();
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({
                event: "command",
                func: "playVideo",
              }),
              "*"
            );
          }
          break;
      }
    };

    // Mouse wheel controls (desktop only)
    const handleWheel = (e: WheelEvent) => {
      if (isMobile) return;
      e.preventDefault();
      const skipAmount = e.deltaY > 0 ? 10 : -10;
      seekVideo(skipAmount);
    };

    // Mouse movement - show/hide cursor (desktop only)
    const handleMouseMoveForCursor = (e: MouseEvent) => {
      if (isMobile) return;
      setShowCursor(true);
      
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      
      cursorTimeoutRef.current = window.setTimeout(() => {
        if (!isDragging) {
          setShowCursor(false);
        }
      }, 3000);

      // Handle dragging
      handleMouseMove(e);
    };

    // Touch move for mobile
    const handleTouchMove = (e: TouchEvent) => {
      handleMouseMove(e);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (!isMobile) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("wheel", handleWheel, { passive: false });
      window.addEventListener("mousemove", handleMouseMoveForCursor);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      // Mobile controls always show cursor
      setShowCursor(true);
    }

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    // Listen for updates from YouTube
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "infoDelivery" && data.info) {
          if (data.info.currentTime !== undefined && !isDragging) {
            setCurrentTime(data.info.currentTime);
          }
          if (data.info.duration !== undefined) {
            setDuration(data.info.duration);
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };

    window.addEventListener("message", handleMessage);

    // Request periodic updates
    const interval = setInterval(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: "listening",
            id: 1,
            channel: "widget",
          }),
          "*"
        );
      }
    }, 1000);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMoveForCursor);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("message", handleMessage);
      clearInterval(interval);
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, [currentTime, duration, isDragging, isMobile]);

  const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{
        ...styles.container,
        cursor: showCursor || isMobile ? "default" : "none",
      }}
      onClick={enableSound}
    >
      <iframe
        ref={iframeRef}
        style={styles.iframe}
        src={`https://www.youtube.com/embed/g5JY2TONktY?autoplay=1&mute=${
          unmuted ? 0 : 1
        }&controls=0&playsinline=1&loop=1&playlist=g5JY2TONktY&modestbranding=1&enablejsapi=1`}
        title="YouTube video"
        allow="autoplay"
        allowFullScreen
      ></iframe>

      {!unmuted && (
        <div style={{
          ...styles.tapText,
          fontSize: isMobile ? '14px' : '18px',
          bottom: isMobile ? '80px' : '100px',
          padding: isMobile ? '6px 12px' : '8px 16px',
        }}>
          🔊 Tap to enable sound
        </div>
      )}

      {/* Progress Bar */}
      <div
        style={{
          ...styles.progressContainer,
          opacity: showCursor || isMobile ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "auto",
          bottom: isMobile ? '15px' : '30px',
          width: isMobile ? '90%' : '80%',
          maxWidth: isMobile ? '100%' : '600px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={progressBarRef}
          style={{
            ...styles.progressBar,
            cursor: "pointer",
            height: isMobile ? '8px' : '6px',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={handleProgressBarClick}
        >
          <div
            style={{
              ...styles.progressFill,
              width: `${percentage}%`,
            }}
          ></div>
          {/* Draggable circle */}
          <div
            style={{
              ...styles.progressCircle,
              left: `${percentage}%`,
              width: isMobile ? '18px' : '14px',
              height: isMobile ? '18px' : '14px',
            }}
          ></div>
        </div>
      </div>

      {/* Keyboard hints - only show on desktop */}
      {!isMobile && (
        <div
          style={{
            ...styles.hint,
            opacity: showCursor ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          ⌨️ ← → (±10s) | ↑ ↓ (±30s) | 🖱️ Scroll (±10s) | Drag progress bar
        </div>
      )}

      {/* Mobile hint */}
      {isMobile && (
        <div
          style={{
            ...styles.hint,
            fontSize: '12px',
            padding: '6px 12px',
            top: '15px',
          }}
        >
          👆 Tap & drag progress bar to seek
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
  },
  iframe: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "120vw",
    height: "120vh",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
    border: "none",
  },
  tapText: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    color: "#fff",
    background: "rgba(0,0,0,0.7)",
    padding: "8px 16px",
    borderRadius: "6px",
    textAlign: "center",
    zIndex: 10,
  },
  progressContainer: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 10,
  },
  progressBar: {
    position: "relative",
    width: "100%",
    background: "rgba(255,255,255,0.3)",
    borderRadius: "4px",
    overflow: "visible",
    touchAction: "none",
  },
  progressFill: {
    height: "100%",
    background: "#ff0000",
    transition: "width 0.1s ease",
    borderRadius: "4px",
  },
  progressCircle: {
    position: "absolute",
    top: "50%",
    transform: "translate(-50%, -50%)",
    background: "#ff0000",
    borderRadius: "50%",
    border: "2px solid #fff",
    transition: "left 0.1s ease",
    cursor: "grab",
    touchAction: "none",
  },
  hint: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    color: "#fff",
    fontSize: "14px",
    background: "rgba(0,0,0,0.7)",
    padding: "8px 16px",
    borderRadius: "6px",
    whiteSpace: "nowrap",
    zIndex: 10,
    textAlign: "center",
    maxWidth: "90%",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};

export default FullscreenYouTubeVideo;