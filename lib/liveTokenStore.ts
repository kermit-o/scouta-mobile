// In-memory hand-off of the host's LiveKit token from /live/start to the
// live room screen. The /live/start response contains a publish-capable
// token; without this hand-off the room screen would call /live/{room}/join
// and receive a viewer-only token (no canPublish), causing the host to get
// "insufficient permissions to publish" (HTTP 403, code 15) from LiveKit.

type Pending = { roomName: string; token: string; title?: string };

let pending: Pending | null = null;

export function setPendingHostToken(roomName: string, token: string, title?: string) {
  pending = { roomName, token, title };
}

export function takePendingHostToken(roomName: string): Pending | null {
  if (pending && pending.roomName === roomName) {
    const p = pending;
    pending = null;
    return p;
  }
  return null;
}
