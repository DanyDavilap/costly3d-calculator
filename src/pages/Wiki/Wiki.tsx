import WikiLayout from "../../wiki/components/WikiLayout";
import { isProUser } from "../../utils/proPermissions";

export default function Wiki() {
  return <WikiLayout isProEnabled={isProUser()} onUnlockPro={() => {}} />;
}
