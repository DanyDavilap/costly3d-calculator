type DebugPayload = Record<string, unknown> | undefined;

export const debugTrack = (eventName: string, payload?: DebugPayload) => {
  if (!import.meta.env.DEV) return;
  const label = `📡 Analytics event \u2192 ${eventName}`;
  if (payload && Object.keys(payload).length > 0) {
    console.groupCollapsed(label);
    console.log(payload);
    console.groupEnd();
    return;
  }
  console.groupCollapsed(label);
  console.log("{}");
  console.groupEnd();
};

export default function DebugAnalyticsPanel() {
  return null;
}
