/** Wedding state paths that chat tools must not write. */
export function isProtectedFromChatWeddingDataPath(path: string): boolean {
  return path === "intro_completed";
}
