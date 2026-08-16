import { useEffect } from "react";

interface SEOMetaProps { title?: string; description?: string; image?: string; url?: string; type?: "website" | "article"; }

const DEFAULT_TITLE = "Cricket Battle — International Player Card Games";
const DEFAULT_DESCRIPTION = "Play four cricket card modes with real players from Nepal and 16 international nations.";
const DEFAULT_IMAGE = "https://Anusharan111.github.io/anime/og-image.png";
const BASE_URL = "https://Anusharan111.github.io/anime";

export function useSEO({ title = DEFAULT_TITLE, description = DEFAULT_DESCRIPTION, image = DEFAULT_IMAGE, url = BASE_URL, type = "website" }: SEOMetaProps) {
  useEffect(() => {
    const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
    const fullImage = image.startsWith("http") ? image : `${BASE_URL}${image}`;
    document.title = title;
    const setMeta = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let tag = document.querySelector(selector) as HTMLMetaElement | null;
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute(property ? "property" : "name", name); document.head.appendChild(tag); }
      tag.setAttribute("content", content);
    };
    setMeta("title", title); setMeta("description", description); setMeta("og:title", title, true); setMeta("og:description", description, true); setMeta("og:image", fullImage, true); setMeta("og:url", fullUrl, true); setMeta("og:type", type, true); setMeta("og:site_name", "Cricket Battle", true); setMeta("twitter:card", "summary_large_image"); setMeta("twitter:title", title); setMeta("twitter:description", description); setMeta("twitter:image", fullImage);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = fullUrl;
  }, [title, description, image, url, type]);
}

export const routeSEO = {
  landing: { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, url: "/" },
  battle: { title: "Cricket Battle Hub — Choose Your Mode", description: "Choose a cricket card mode and start playing instantly.", url: "/#/battle" },
  draft: { title: "Cricket Draft Battle — Build Your Team", description: "Draft real cricket players from Nepal and international rosters.", url: "/#/draft" },
  results: { title: "Cricket Battle Results", description: "View role-by-role cricket battle results and the final victor.", url: "/#/results" },
  feud: { title: "Cricket Feud — Trivia Clash", description: "Guess the top cricket answers and steal rounds.", url: "/#/feud" },
  guesswho: { title: "Cricket Guess Who", description: "Identify the hidden international cricketer before your rival.", url: "/#/guesswho" },
  party: { title: "Cricket Party Games", description: "Bring friends into quick rounds of cricket player guessing.", url: "/#/party" },
} as const;
