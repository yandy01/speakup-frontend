export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} · Eloquia` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · Eloquia` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
