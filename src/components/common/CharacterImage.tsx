import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, ImageOff } from "lucide-react";
import { getProxyImageUrl } from "../../types";

interface CharacterImageProps {
  url: string;
  name: string;
  fallbackUrl?: string;
  className?: string;
  themeColor?: string;
  layoutId?: string;
  disableProxy?: boolean;
}

export default function CharacterImage({
  url,
  name,
  fallbackUrl,
  className,
  themeColor,
  layoutId,
  disableProxy = false,
}: CharacterImageProps) {
  const [src, setSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Track which raw URL we're currently trying so fallback comparison works
  const currentRawUrl = useRef<string>("");

  useEffect(() => {
    setLoading(true);
    setFailed(false);

    const raw = url || fallbackUrl || "";
    currentRawUrl.current = raw;

    if (!raw) {
      setFailed(true);
      setLoading(false);
      return;
    }

    setSrc(disableProxy ? raw : getProxyImageUrl(raw));
  }, [url, fallbackUrl, disableProxy]);

  const handleError = () => {
    // If we were trying the primary URL and a different fallback exists, try it
    if (currentRawUrl.current === url && fallbackUrl && fallbackUrl !== url) {
      currentRawUrl.current = fallbackUrl;
      setSrc(disableProxy ? fallbackUrl : getProxyImageUrl(fallbackUrl));
      return;
    }

    // If proxy failed, try the raw URL directly as a last resort
    const rawUrl = currentRawUrl.current;
    if (!disableProxy && rawUrl && src !== rawUrl) {
      setSrc(rawUrl);
      return;
    }

    // Everything failed
    setFailed(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
    setFailed(false);
  };

  return (
    <div className={`relative overflow-hidden flex items-center justify-center min-w-[50px] min-h-[50px] ${className ?? "w-full h-full"}`}>
      <AnimatePresence mode="wait">
        {failed ? (
          <motion.div
            key="fallback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: themeColor ? `${themeColor}12` : "#ffffff08" }}
          >
            <ImageOff className="w-1/3 h-1/3 opacity-10" style={{ color: themeColor }} />
          </motion.div>
        ) : src ? (
          <motion.img
            key={src}
            layoutId={layoutId}
            src={src}
            alt={name}
            onLoad={handleLoad}
            onError={handleError}
            initial={{ opacity: 0 }}
            animate={{ opacity: loading ? 0 : 1 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full object-cover"
          />
        ) : null}
      </AnimatePresence>

      {loading && !failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
        </div>
      )}
    </div>
  );
}
