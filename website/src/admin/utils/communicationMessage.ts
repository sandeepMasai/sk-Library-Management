/** First line of message, or a short fallback when only an image is sent. */
export function deriveCommunicationTitle(message: string, hasAttachment = false): string {
  const firstLine =
    message
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) || '';
  if (firstLine) return firstLine.slice(0, 80);
  if (hasAttachment) return 'Message from library';
  return '';
}
