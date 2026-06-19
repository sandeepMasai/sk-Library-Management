/** First line of message, or a short fallback when only an image is sent. */
export function deriveCommunicationTitle(message: string, hasImage = false): string {
  const firstLine =
    message
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) || '';
  if (firstLine) return firstLine.slice(0, 80);
  if (hasImage) return 'Photo from library';
  return '';
}
