const extOf = (name: string) => {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
};

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.qt': 'video/quicktime',
  '.hevc': 'video/hevc',
  '.h265': 'video/hevc',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.3gp': 'video/3gpp',
  '.3g2': 'video/3gpp2',
};

export function normalizedMediaMime(name: string, reported = ''): string {
  const clean = String(reported || '').trim().toLowerCase();
  if (clean.startsWith('image/') || clean.startsWith('video/')) return clean;
  return MIME_BY_EXT[extOf(name)] || clean || 'application/octet-stream';
}

export function isVideoLike(name: string, reported = ''): boolean {
  return normalizedMediaMime(name, reported).startsWith('video/');
}

export function isImageLike(name: string, reported = ''): boolean {
  return normalizedMediaMime(name, reported).startsWith('image/');
}

export function isHevcLike(name: string, reported = ''): boolean {
  const mime = normalizedMediaMime(name, reported);
  const ext = extOf(name);
  return mime.includes('hevc') || ext === '.hevc' || ext === '.h265';
}
