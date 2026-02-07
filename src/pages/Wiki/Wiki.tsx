import WikiLayout from "../../wiki/components/WikiLayout";
import { isPro } from "../../utils/appMode";

export default function Wiki() {
  return <WikiLayout isProEnabled={isPro()} onUnlockPro={() => {}} />;
}
